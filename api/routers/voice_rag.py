"""
Voice RAG Pipeline — Voice-to-text → RAG query → text-to-speech.

Provides endpoints for voice-based interaction with notebook context,
including conversational voice chat powered by vector search.
"""

import json
from typing import AsyncGenerator, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger
from pydantic import BaseModel, Field

from open_notebook.domain.notebook import Notebook, vector_search
from open_notebook.utils.text_utils import extract_text_content

router = APIRouter()


# ── Models ───────────────────────────────────────────────────────────


class VoiceChatRequest(BaseModel):
    """Request for voice-based RAG chat."""

    text: str = Field(..., description="User's question (from STT or direct text)")
    notebook_id: Optional[str] = Field(
        None, description="Notebook ID for scoped context"
    )
    session_id: Optional[str] = Field(
        None, description="Chat session ID for conversation continuity"
    )
    use_rag: bool = Field(
        default=True, description="Whether to use RAG context from notebook"
    )
    voice: str = Field(
        default="af_heart", description="TTS voice for response synthesis"
    )
    speed: float = Field(default=1.0, description="TTS playback speed")


class VoiceChatMessage(BaseModel):
    """A single message in voice chat history."""

    role: str = Field(..., description="human or ai")
    content: str = Field(..., description="Message text")
    timestamp: Optional[str] = None
    audio_url: Optional[str] = None


class VoiceChatResponse(BaseModel):
    """Response from voice RAG pipeline."""

    answer: str = Field(..., description="AI-generated text response")
    sources_used: int = Field(default=0, description="Number of RAG sources consulted")
    session_id: Optional[str] = Field(
        None, description="Chat session ID"
    )


# ── Streaming Voice Chat ────────────────────────────────────────────


_conversation_histories: dict[str, List[dict]] = {}


def _add_to_history(session_id: Optional[str], role: str, content: str):
    if not session_id:
        return
    if session_id not in _conversation_histories:
        # Cap total active sessions to prevent leaks
        if len(_conversation_histories) > 200:
            # Simple FIFO eviction
            oldest = list(_conversation_histories.keys())[0]
            del _conversation_histories[oldest]
        _conversation_histories[session_id] = []
    
    _conversation_histories[session_id].append({"role": role, "content": content})
    # Keep only the last 10 messages (5 turns)
    if len(_conversation_histories[session_id]) > 10:
        _conversation_histories[session_id] = _conversation_histories[session_id][-10:]


def _get_history_context(session_id: Optional[str]) -> str:
    if not session_id or session_id not in _conversation_histories:
        return ""
    
    parts = []
    for msg in _conversation_histories[session_id]:
        role_label = "Human" if msg["role"] == "human" else "Assistant"
        parts.append(f"{role_label}: {msg['content']}")
    return "\n".join(parts)


async def _stream_voice_chat(
    text: str,
    notebook_id: Optional[str],
    use_rag: bool,
    session_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream a voice RAG response as SSE."""
    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from open_notebook.ai.provision import provision_langchain_model

        yield f"data: {json.dumps({'type': 'status', 'content': 'Processing query...'})}\n\n"

        # Record user query in conversation memory
        _add_to_history(session_id, "human", text)

        # ── Build context from notebook ──
        rag_context = ""
        sources_used = 0

        if use_rag:
            yield f"data: {json.dumps({'type': 'status', 'content': 'Searching knowledge base...'})}\n\n"

            try:
                # If notebook-scoped, get notebook context
                if notebook_id:
                    try:
                        notebook = await Notebook.get(notebook_id)
                        if notebook:
                            # Build context from notebook's sources and notes
                            try:
                                sources = await notebook.get_sources()
                                for src in sources[:5]:
                                    title = src.title or "Untitled"
                                    rag_context += f"Source: {title}\n"
                                    sources_used += 1
                            except Exception as e:
                                logger.warning(f"Failed to get notebook sources: {e}")

                            try:
                                notes = await notebook.get_notes()
                                for note in notes[:5]:
                                    title = note.title or "Untitled"
                                    content = (note.content or "")[:300]
                                    rag_context += f"Note: {title}\n{content}\n\n"
                                    sources_used += 1
                            except Exception as e:
                                logger.warning(f"Failed to get notebook notes: {e}")
                    except Exception as e:
                        logger.warning(f"Failed to get notebook context: {e}")

                # Also do vector search
                results = await vector_search(
                    keyword=text,
                    results=5,
                    source=True,
                    note=True,
                    minimum_score=0.3,
                )

                if results:
                    # ── Reranker: apply if configured ──
                    try:
                        from open_notebook.ai.models import model_manager
                        reranker_model = await model_manager.get_default_model("reranker")
                        if reranker_model:
                            from esperanto import LanguageModel
                            if isinstance(reranker_model, LanguageModel) and hasattr(reranker_model, "to_langchain"):
                                reranker_model = reranker_model.to_langchain()
                            from langchain_core.messages import SystemMessage as SysMsg, HumanMessage as HumMsg
                            import re as reranker_re

                            items_text = ""
                            for idx, r in enumerate(results):
                                if isinstance(r, dict):
                                    title = r.get("title", f"Source {idx}")
                                    snippet = r.get("content", "")[:200]
                                else:
                                    title = getattr(r, "title", f"Source {idx}")
                                    snippet = (getattr(r, "content", "") or "")[:200]
                                items_text += f"[{idx}] {title}: {snippet}\n"

                            rerank_prompt = (
                                f"You are a relevance scoring engine. Given the query and search results below, "
                                f"return ONLY a JSON array of objects with 'index' (int) and 'score' (float 0-1) "
                                f"sorted by relevance, highest first. No explanation.\n\n"
                                f"Query: {text}\n\nResults:\n{items_text}"
                            )
                            response = await reranker_model.ainvoke([
                                SysMsg(content="You are a search result reranker. Output only valid JSON."),
                                HumMsg(content=rerank_prompt),
                            ])
                            response_text = extract_text_content(response.content)
                            json_match = reranker_re.search(r'\[.*\]', response_text, reranker_re.DOTALL)
                            if json_match:
                                import json as json_mod
                                scores = json_mod.loads(json_match.group())
                                score_map = {item["index"]: item["score"] for item in scores if "index" in item and "score" in item}
                                # Sort results by reranker scores
                                indexed_results = list(enumerate(results))
                                indexed_results.sort(
                                    key=lambda x: score_map.get(x[0], 0),
                                    reverse=True,
                                )
                                results = [r for _, r in indexed_results]
                                logger.info(f"Voice RAG: Reranked {len(results)} results")
                    except Exception as rerank_err:
                        logger.warning(f"Voice RAG reranking failed, using original order: {rerank_err}")

                    # Build context and citations from (possibly reranked) results
                    citations = []
                    for i, r in enumerate(results, 1):
                        if isinstance(r, dict):
                            title = r.get("title", f"Source {i}")
                            content = r.get("content", "")[:400]
                        else:
                            title = getattr(r, "title", f"Source {i}")
                            content = (getattr(r, "content", "") or "")[:400]

                        rag_context += f"[{i}] {title}\n{content}\n\n"
                        citations.append({"index": i, "title": title})
                        sources_used += 1

                    # Stream citations for frontend display
                    yield f"data: {json.dumps({'type': 'citations', 'content': citations})}\n\n"
                    yield f"data: {json.dumps({'type': 'status', 'content': f'Found {sources_used} relevant sources'})}\n\n"
            except Exception as e:
                logger.warning(f"RAG search failed, continuing without context: {e}")

        # ── Build prompts ──
        system_prompt = (
            "You are a helpful voice assistant for a research and knowledge management platform. "
            "Respond conversationally and concisely — your response will be read aloud via TTS. "
            "Keep responses under 3 paragraphs unless the user explicitly asks for detail. "
            "When using context, reference key points naturally but don't list source numbers."
        )

        history_context = _get_history_context(session_id)
        if rag_context:
            user_prompt = f"Context from knowledge base:\n{rag_context}\n\n"
            if history_context:
                user_prompt += f"Previous conversation history:\n{history_context}\n\n"
            user_prompt += f"User question: {text}"
        else:
            if history_context:
                user_prompt = f"Previous conversation history:\n{history_context}\n\nUser question: {text}"
            else:
                user_prompt = text

        # ── Stream LLM response ──
        yield f"data: {json.dumps({'type': 'status', 'content': 'Generating response...'})}\n\n"

        llm = await provision_langchain_model(
            content=user_prompt, model_id=None, default_type="chat"
        )

        payload = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        accumulated = ""
        async for chunk in llm.astream(payload):
            content = extract_text_content(chunk.content)
            if content:
                accumulated += content
                yield f"data: {json.dumps({'type': 'answer', 'content': content})}\n\n"

        # Record assistant answer in conversation memory
        _add_to_history(session_id, "ai", accumulated)

        yield f"data: {json.dumps({'type': 'final_answer', 'content': accumulated, 'sources_used': sources_used})}\n\n"
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    except Exception as e:
        logger.error(f"Voice chat error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


# ── Endpoints ────────────────────────────────────────────────────────


@router.post("/voice/chat")
async def voice_chat(request: VoiceChatRequest):
    """
    Voice RAG chat — streaming SSE response.

    Accepts text (typically from STT), searches knowledge base for context,
    generates an AI response, and streams it back for TTS synthesis.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Empty text input")

    return StreamingResponse(
        _stream_voice_chat(
            text=request.text,
            notebook_id=request.notebook_id,
            use_rag=request.use_rag,
            session_id=request.session_id,
        ),
        media_type="text/event-stream",
    )


@router.post("/voice/chat/simple", response_model=VoiceChatResponse)
async def voice_chat_simple(request: VoiceChatRequest):
    """
    Voice RAG chat — simple non-streaming response.

    Returns the complete AI response at once (useful for short queries).
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Empty text input")

    try:
        from langchain_core.messages import HumanMessage, SystemMessage
        from open_notebook.ai.provision import provision_langchain_model

        # Record user query in conversation memory
        _add_to_history(request.session_id, "human", request.text)

        # Build RAG context
        rag_context = ""
        sources_used = 0

        if request.use_rag:
            try:
                results = await vector_search(
                    keyword=request.text,
                    results=5,
                    source=True,
                    note=True,
                    minimum_score=0.3,
                )
                if results:
                    for i, r in enumerate(results, 1):
                        title = r.get("title", f"Source {i}") if isinstance(r, dict) else getattr(r, "title", f"Source {i}")
                        content = (r.get("content", "") if isinstance(r, dict) else getattr(r, "content", ""))[:400]
                        rag_context += f"[{i}] {title}\n{content}\n\n"
                        sources_used += 1
            except Exception as e:
                logger.warning(f"RAG search failed: {e}")

        system_prompt = (
            "You are a helpful voice assistant. Respond concisely. "
            "Your response will be read aloud via TTS."
        )

        history_context = _get_history_context(request.session_id)
        if rag_context:
            user_prompt = f"Context:\n{rag_context}\n\n"
            if history_context:
                user_prompt += f"Previous conversation history:\n{history_context}\n\n"
            user_prompt += f"Question: {request.text}"
        else:
            if history_context:
                user_prompt = f"Previous conversation history:\n{history_context}\n\nQuestion: {request.text}"
            else:
                user_prompt = request.text

        llm = await provision_langchain_model(
            content=user_prompt, model_id=None, default_type="chat"
        )

        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ])

        answer = extract_text_content(response.content)

        # Record assistant answer in conversation memory
        _add_to_history(request.session_id, "ai", answer)

        return VoiceChatResponse(
            answer=answer,
            sources_used=sources_used,
            session_id=request.session_id,
        )

    except Exception as e:
        logger.error(f"Voice chat simple error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
