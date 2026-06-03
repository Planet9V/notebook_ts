import json
import os
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, SystemMessage
from loguru import logger

from api.models import (
    AskRequest,
    AskResponse,
    CompareRequest,
    CompareResponse,
    ResearchRequest,
    ResearchResponse,
    SearchRequest,
    SearchResponse,
)
from open_notebook.ai.models import Model, model_manager
from open_notebook.domain.notebook import text_search, vector_search
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError
from open_notebook.graphs.ask import graph as ask_graph
from open_notebook.utils.text_utils import extract_text_content

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(search_request: SearchRequest):
    """Search the knowledge base using vector or hybrid (vector + Valyu) search."""
    import asyncio
    import httpx

    try:
        # ── Always run vector search ──
        if not await model_manager.get_embedding_model():
            raise HTTPException(
                status_code=400,
                detail="Search requires an embedding model. Please configure one in the Models section.",
            )

        local_results = await vector_search(
            keyword=search_request.query,
            results=search_request.limit,
            source=search_request.search_sources,
            note=search_request.search_notes,
            minimum_score=search_request.minimum_score,
        )

        # Tag local results with source_origin
        all_results = []
        for r in (local_results or []):
            if isinstance(r, dict):
                r["source_origin"] = "Local KB"
            all_results.append(r)

        # ── Hybrid: also query Valyu ──
        if search_request.type == "hybrid":
            from open_notebook.ai.key_provider import get_api_key

            valyu_key = await get_api_key("valyu")
            if not valyu_key:
                valyu_key = os.environ.get("VALYU_API_KEY")

            if valyu_key:
                try:
                    async with httpx.AsyncClient(timeout=15.0) as client:
                        resp = await client.post(
                            "https://api.valyu.ai/v1/search",
                            headers={"Content-Type": "application/json", "X-API-Key": valyu_key},
                            json={"query": search_request.query, "search_type": "all", "max_num_results": min(search_request.limit, 20)},
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            valyu_results = data.get("results", [])
                            # Collect existing titles for dedup
                            existing_titles = {r.get("title", "").lower().strip() for r in all_results if isinstance(r, dict)}
                            for vr in valyu_results:
                                title = vr.get("title", "Valyu Source")
                                if title.lower().strip() in existing_titles:
                                    continue  # Skip duplicates
                                all_results.append({
                                    "id": f"valyu:{vr.get('id', '')}",
                                    "title": title,
                                    "parent_id": None,
                                    "content": vr.get("content", vr.get("snippet", ""))[:500],
                                    "url": vr.get("url", ""),
                                    "relevance": vr.get("relevance_score", 0.5),
                                    "similarity": vr.get("relevance_score", 0.5),
                                    "score": vr.get("relevance_score", 0.5),
                                    "matches": [vr.get("content", vr.get("snippet", ""))[:300]] if vr.get("content") or vr.get("snippet") else [],
                                    "source_origin": "Valyu",
                                    "created": "",
                                    "updated": "",
                                })
                        else:
                            logger.warning(f"Valyu search returned {resp.status_code}")
                except Exception as e:
                    logger.warning(f"Valyu search failed in hybrid mode: {e}")

        # ── Reranker: LLM-based reranking ──
        if search_request.reranker and all_results:
            try:
                reranker_model = await model_manager.get_default_model("reranker")
                if reranker_model:
                    from esperanto import LanguageModel
                    if isinstance(reranker_model, LanguageModel) and hasattr(reranker_model, "to_langchain"):
                        reranker_model = reranker_model.to_langchain()
                    # Build a scoring prompt
                    items_text = ""
                    for idx, r in enumerate(all_results):
                        title = r.get("title", "Untitled") if isinstance(r, dict) else "Untitled"
                        snippet = ""
                        if isinstance(r, dict):
                            matches = r.get("matches", [])
                            snippet = matches[0][:200] if matches else r.get("content", "")[:200]
                        items_text += f"[{idx}] {title}: {snippet}\n"

                    rerank_prompt = (
                        f"You are a relevance scoring engine. Given the query and search results below, "
                        f"return ONLY a JSON array of objects with 'index' (int) and 'score' (float 0-1) "
                        f"sorted by relevance, highest first. No explanation.\n\n"
                        f"Query: {search_request.query}\n\n"
                        f"Results:\n{items_text}"
                    )

                    response = await reranker_model.ainvoke([
                        SystemMessage(content="You are a search result reranker. Output only valid JSON."),
                        HumanMessage(content=rerank_prompt),
                    ])

                    # Parse response
                    response_text = extract_text_content(response)
                    # Extract JSON from response (handle markdown code blocks)
                    import re
                    json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                    if json_match:
                        scores = json.loads(json_match.group())
                        # Apply new scores
                        score_map = {item["index"]: item["score"] for item in scores if "index" in item and "score" in item}
                        for idx, r in enumerate(all_results):
                            if isinstance(r, dict) and idx in score_map:
                                r["relevance"] = score_map[idx]
                                r["similarity"] = score_map[idx]
                                r["score"] = score_map[idx]
                        # Resort by new scores
                        all_results.sort(key=lambda x: x.get("score", 0) if isinstance(x, dict) else 0, reverse=True)
                        logger.info(f"Reranked {len(all_results)} results using reranker model")
                else:
                    logger.warning("Reranker requested but no default reranker model configured")
            except Exception as e:
                logger.warning(f"Reranking failed, returning original order: {e}")

        return SearchResponse(
            results=all_results,
            total_count=len(all_results),
            search_type=search_request.type,
        )

    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseOperationError as e:
        logger.error(f"Database error during search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/search/compare", response_model=CompareResponse)
async def compare_search(request: CompareRequest):
    """
    Perform search with and without reranker and return scores, result items, and latency comparisons.
    """
    import time
    from open_notebook.exceptions import DatabaseOperationError

    try:
        # Check embedding model exists
        if not await model_manager.get_embedding_model():
            raise HTTPException(
                status_code=400,
                detail="Search comparison requires an embedding model.",
            )

        # ── 1. Run raw vector search (no reranker) and measure latency ──
        start_raw = time.perf_counter()
        raw_results = await vector_search(
            keyword=request.query,
            results=request.limit,
            source=True,
            note=True,
            minimum_score=0.0,  # Get all matching items
        )
        end_raw = time.perf_counter()
        raw_latency_ms = (end_raw - start_raw) * 1000

        # Tag raw results with origin
        raw_list = []
        for idx, r in enumerate(raw_results or []):
            if isinstance(r, dict):
                rc = r.copy()
                rc["source_origin"] = "Local KB"
                rc["original_index"] = idx
                raw_list.append(rc)

        # ── 2. Run reranked search and measure latency ──
        start_rerank = time.perf_counter()
        reranked_list = [r.copy() for r in raw_list]
        
        reranker_model = await model_manager.get_default_model("reranker")
        if reranker_model:
            from esperanto import LanguageModel
            if isinstance(reranker_model, LanguageModel) and hasattr(reranker_model, "to_langchain"):
                reranker_model = reranker_model.to_langchain()
        if reranker_model and reranked_list:
            try:
                # Build scoring prompt
                items_text = ""
                for idx, r in enumerate(reranked_list):
                    title = r.get("title", "Untitled")
                    matches = r.get("matches", [])
                    snippet = matches[0][:200] if matches else r.get("content", "")[:200]
                    items_text += f"[{idx}] {title}: {snippet}\n"

                rerank_prompt = (
                    f"You are a relevance scoring engine. Given the query and search results below, "
                    f"return ONLY a JSON array of objects with 'index' (int) and 'score' (float 0-1) "
                    f"sorted by relevance, highest first. No explanation.\n\n"
                    f"Query: {request.query}\n\n"
                    f"Results:\n{items_text}"
                )

                response = await reranker_model.ainvoke([
                    SystemMessage(content="You are a search result reranker. Output only valid JSON."),
                    HumanMessage(content=rerank_prompt),
                ])

                response_text = extract_text_content(response)
                import re
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    scores = json.loads(json_match.group())
                    score_map = {item["index"]: item["score"] for item in scores if "index" in item and "score" in item}
                    for idx, r in enumerate(reranked_list):
                        if idx in score_map:
                            r["relevance"] = score_map[idx]
                            r["similarity"] = score_map[idx]
                            r["score"] = score_map[idx]
                    # Resort by new scores
                    reranked_list.sort(key=lambda x: x.get("score", 0), reverse=True)
            except Exception as e:
                logger.warning(f"Comparison reranking failed: {e}")
        
        end_rerank = time.perf_counter()
        reranked_latency_ms = (end_rerank - start_rerank) * 1000 + raw_latency_ms

        return CompareResponse(
            raw_latency_ms=raw_latency_ms,
            reranked_latency_ms=reranked_latency_ms,
            raw_results=raw_list,
            reranked_results=reranked_list,
        )

    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DatabaseOperationError as e:
        logger.error(f"Database error during comparison search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Compare search failed: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during comparison search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Compare search failed: {str(e)}")


async def stream_ask_response(
    question: str, strategy_model: Model, answer_model: Model, final_answer_model: Model
) -> AsyncGenerator[str, None]:
    """Stream the ask response as Server-Sent Events."""
    try:
        final_answer = None

        async for chunk in ask_graph.astream(
            input=dict(question=question),  # type: ignore[arg-type]
            config=dict(
                configurable=dict(
                    strategy_model=strategy_model.id,
                    answer_model=answer_model.id,
                    final_answer_model=final_answer_model.id,
                )
            ),
            stream_mode="updates",
        ):
            if "agent" in chunk:
                strategy_data = {
                    "type": "strategy",
                    "reasoning": chunk["agent"]["strategy"].reasoning,
                    "searches": [
                        {"term": search.term, "instructions": search.instructions}
                        for search in chunk["agent"]["strategy"].searches
                    ],
                }
                yield f"data: {json.dumps(strategy_data)}\n\n"

            elif "provide_answer" in chunk:
                for answer in chunk["provide_answer"]["answers"]:
                    answer_data = {"type": "answer", "content": answer}
                    yield f"data: {json.dumps(answer_data)}\n\n"

            elif "write_final_answer" in chunk:
                final_answer = chunk["write_final_answer"]["final_answer"]
                final_data = {"type": "final_answer", "content": final_answer}
                yield f"data: {json.dumps(final_data)}\n\n"

        # Send completion signal
        completion_data = {"type": "complete", "final_answer": final_answer}
        yield f"data: {json.dumps(completion_data)}\n\n"

    except Exception as e:
        from open_notebook.utils.error_classifier import classify_error

        _, user_message = classify_error(e)
        logger.error(f"Error in ask streaming: {str(e)}")
        error_data = {"type": "error", "message": user_message}
        yield f"data: {json.dumps(error_data)}\n\n"


@router.post("/search/ask")
async def ask_knowledge_base(ask_request: AskRequest):
    """Ask the knowledge base a question using AI models."""
    try:
        # Validate models exist
        strategy_model = await Model.get(ask_request.strategy_model)
        answer_model = await Model.get(ask_request.answer_model)
        final_answer_model = await Model.get(ask_request.final_answer_model)

        if not strategy_model:
            raise HTTPException(
                status_code=400,
                detail=f"Strategy model {ask_request.strategy_model} not found",
            )
        if not answer_model:
            raise HTTPException(
                status_code=400,
                detail=f"Answer model {ask_request.answer_model} not found",
            )
        if not final_answer_model:
            raise HTTPException(
                status_code=400,
                detail=f"Final answer model {ask_request.final_answer_model} not found",
            )

        # Check if embedding model is available
        if not await model_manager.get_embedding_model():
            raise HTTPException(
                status_code=400,
                detail="Ask feature requires an embedding model. Please configure one in the Models section.",
            )

        # For streaming response
        return StreamingResponse(
            stream_ask_response(
                ask_request.question, strategy_model, answer_model, final_answer_model
            ),
            media_type="text/plain",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ask endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ask operation failed: {str(e)}")


@router.post("/search/ask/simple", response_model=AskResponse)
async def ask_knowledge_base_simple(ask_request: AskRequest):
    """Ask the knowledge base a question and return a simple response (non-streaming)."""
    try:
        # Validate models exist
        strategy_model = await Model.get(ask_request.strategy_model)
        answer_model = await Model.get(ask_request.answer_model)
        final_answer_model = await Model.get(ask_request.final_answer_model)

        if not strategy_model:
            raise HTTPException(
                status_code=400,
                detail=f"Strategy model {ask_request.strategy_model} not found",
            )
        if not answer_model:
            raise HTTPException(
                status_code=400,
                detail=f"Answer model {ask_request.answer_model} not found",
            )
        if not final_answer_model:
            raise HTTPException(
                status_code=400,
                detail=f"Final answer model {ask_request.final_answer_model} not found",
            )

        # Check if embedding model is available
        if not await model_manager.get_embedding_model():
            raise HTTPException(
                status_code=400,
                detail="Ask feature requires an embedding model. Please configure one in the Models section.",
            )

        # Run the ask graph and get final result
        final_answer = None
        async for chunk in ask_graph.astream(
            input=dict(question=ask_request.question),  # type: ignore[arg-type]
            config=dict(
                configurable=dict(
                    strategy_model=strategy_model.id,
                    answer_model=answer_model.id,
                    final_answer_model=final_answer_model.id,
                )
            ),
            stream_mode="updates",
        ):
            if "write_final_answer" in chunk:
                final_answer = chunk["write_final_answer"]["final_answer"]

        if not final_answer:
            raise HTTPException(status_code=500, detail="No answer generated")

        return AskResponse(answer=final_answer, question=ask_request.question)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ask simple endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ask operation failed: {str(e)}")


async def stream_research_response(
    query: str,
    engine: str,
    transformation_id: Optional[str] = None,
    model_id: Optional[str] = None,
    custom_prompt: Optional[str] = None,
    output_formatting: Optional[str] = None,
    styleguide_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    try:
        from open_notebook.domain.credential import Credential
        from open_notebook.domain.transformation import Transformation
        from open_notebook.ai.key_provider import get_api_key
        import httpx

        # 1. Build system prompt
        system_prompt = "You are a professional intelligence researcher. Provide structured, detailed research findings with clear citations."
        if transformation_id:
            try:
                transformation = await Transformation.get(transformation_id)
                if transformation:
                    system_prompt += f"\nFollow these specific instructions for organizing and formatting your research:\n{transformation.prompt}"
            except Exception as te:
                logger.warning(f"Failed to load transformation {transformation_id}: {te}")

        if custom_prompt:
            system_prompt += f"\nAdditional guidelines:\n{custom_prompt}"

        if output_formatting:
            system_prompt += f"\n\n--- Output Formatting Instructions ---\n{output_formatting}"

        if styleguide_id:
            try:
                from open_notebook.domain.styleguide import StyleGuide
                sg = await StyleGuide.get(styleguide_id)
                if sg:
                    system_prompt += f"\n\n--- Style Guide: {sg.name} ---\n"
                    system_prompt += f"Document Type: {sg.guide_type}\n"
                    system_prompt += f"Typography: Title={sg.title_font} {sg.title_size}, Headings={sg.heading_size}, Subheadings={sg.subheading_size}, Body={sg.body_font} {sg.body_size}\n"
                    system_prompt += f"Line Spacing: {sg.line_spacing}\n"
                    system_prompt += f"Colors: Primary={sg.primary_color}, Secondary={sg.secondary_color}, Accent={sg.accent_color}\n"
                    system_prompt += f"Layout: {sg.page_size} {sg.page_orientation}, Margins: T={sg.margin_top} B={sg.margin_bottom} L={sg.margin_left} R={sg.margin_right}\n"
                    system_prompt += f"Heading Style: {sg.heading_style}, Color Scheme: {sg.color_scheme}\n"
                    system_prompt += f"Include TOC: {sg.include_toc}, Page Numbers: {sg.include_page_numbers}\n"
                    if sg.strapline:
                        system_prompt += f"Strapline: {sg.strapline}\n"
                    system_prompt += "Format your output according to these style guide specifications.\n"
            except Exception as sge:
                logger.warning(f"Failed to load style guide {styleguide_id}: {sge}")

        # ─── Engine: LOCAL (vector search on local KB) ───
        if engine == "local":
            from open_notebook.domain.notebook import vector_search as kb_vector_search

            yield f"data: {json.dumps({'type': 'status', 'content': 'Searching local knowledge base...'})}\n\n"

            search_results = []
            try:
                results = await kb_vector_search(
                    keyword=query, results=10, source=True, note=True, minimum_score=0.2
                )
                if results:
                    search_results = results
            except Exception as e:
                logger.warning(f"Local KB vector search failed: {e}")

            if not search_results:
                yield f"data: {json.dumps({'type': 'status', 'content': 'No local KB results found. Synthesizing from prompt...'})}\n\n"
                sources: List[Dict[str, Any]] = []
            else:
                sources = [
                    {
                        "title": getattr(r, "title", None) or r.get("title", f"KB Source {i}") if isinstance(r, dict) else f"KB Source {i}",
                        "url": "local://kb",
                        "content": (getattr(r, "content", None) or r.get("content", "") if isinstance(r, dict) else "")[:500],
                    }
                    for i, r in enumerate(search_results, 1)
                ]
                yield f"data: {json.dumps({'type': 'sources', 'content': sources})}\n\n"
                yield f"data: {json.dumps({'type': 'status', 'content': f'Found {len(sources)} local results. Generating synthesis...'})}\n\n"

            # Compile context and synthesize
            search_context = ""
            for i, src in enumerate(sources, 1):
                search_context += f"[{i}] {src['title']}\\nContent: {src['content']}\n\n"

            from open_notebook.ai.provision import provision_langchain_model
            final_user_prompt = f"Local Knowledge Base Context:\\n{search_context}\n\nQuery:\\n{query}"

            llm_model = await provision_langchain_model(
                content=final_user_prompt, model_id=None, default_type="chat"
            )

            payload = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=final_user_prompt),
            ]

            accumulated_answer = ""
            async for chunk in llm_model.astream(payload):
                content = extract_text_content(chunk.content)
                if content:
                    accumulated_answer += content
                    yield f"data: {json.dumps({'type': 'answer', 'content': content})}\n\n"

            yield f"data: {json.dumps({'type': 'final_answer', 'content': accumulated_answer})}\n\n"
            yield f"data: {json.dumps({'type': 'complete', 'final_answer': accumulated_answer})}\n\n"

        # ─── Engine: PERPLEXITY (online search via Perplexity API) ───
        elif engine == "perplexity":
            perplexity_key = await get_api_key("perplexity")
            if not perplexity_key:
                perplexity_key = os.environ.get("PERPLEXITY_API_KEY")

            if not perplexity_key:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Perplexity API key not configured. Please add one under Settings.'})}\n\n"
                return

            yield f"data: {json.dumps({'type': 'status', 'content': 'Initializing Perplexity online search...'})}\n\n"

            # Map model name
            model_name = "sonar"
            if model_id:
                try:
                    registered_model = await Model.get(model_id)
                    if registered_model:
                        model_name = registered_model.name
                except Exception:
                    pass

            # Make the API call
            async with httpx.AsyncClient(timeout=60.0) as client:
                try:
                    async with client.stream(
                        "POST",
                        "https://api.perplexity.ai/chat/completions",
                        headers={"Authorization": f"Bearer {perplexity_key}"},
                        json={
                            "model": model_name,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": query},
                            ],
                            "stream": True,
                        },
                    ) as response:
                        if response.status_code != 200:
                            err_body = await response.aread()
                            yield f"data: {json.dumps({'type': 'error', 'message': f'Perplexity API error: {response.status_code} - {err_body.decode()}'})}\n\n"
                            return

                        citations_sent = False
                        accumulated_answer = ""

                        async for chunk in response.iter_lines():
                            if not chunk:
                                continue
                            line = chunk.decode("utf-8").strip()
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    continue
                                try:
                                    data_json = json.loads(data_str)

                                    # Extract citations if present
                                    citations = data_json.get("citations", [])
                                    if citations and not citations_sent:
                                        ppl_sources = [
                                            {"title": f"Web Source {i}", "url": url}
                                            for i, url in enumerate(citations, 1)
                                        ]
                                        yield f"data: {json.dumps({'type': 'sources', 'content': ppl_sources})}\n\n"
                                        citations_sent = True

                                    choices = data_json.get("choices", [])
                                    if choices:
                                        delta = choices[0].get("delta", {})
                                        content = delta.get("content", "")
                                        if content:
                                            accumulated_answer += content
                                            yield f"data: {json.dumps({'type': 'answer', 'content': content})}\n\n"
                                except Exception as e:
                                    logger.warning(f"Error parsing perplexity stream line: {e}")

                        yield f"data: {json.dumps({'type': 'final_answer', 'content': accumulated_answer})}\n\n"
                        yield f"data: {json.dumps({'type': 'complete', 'final_answer': accumulated_answer})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'message': f'Failed to query Perplexity: {str(e)}'})}\n\n"

        # ─── Engine: HYBRID (Local KB RAG + Perplexity + Valyu) ───
        elif engine == "hybrid":
            from open_notebook.domain.notebook import vector_search as kb_vector_search

            perplexity_key = await get_api_key("perplexity")
            if not perplexity_key:
                perplexity_key = os.environ.get("PERPLEXITY_API_KEY")
            valyu_key = await get_api_key("valyu")
            if not valyu_key:
                valyu_key = os.environ.get("VALYU_API_KEY")

            yield f"data: {json.dumps({'type': 'status', 'content': 'Running Hybrid Multi-Engine search (Local KB + Perplexity + Valyu)...'})}\n\n"

            all_sources: List[Dict[str, Any]] = []
            perplexity_analysis = ""

            # ── 1. Local KB vector search ──
            yield f"data: {json.dumps({'type': 'status', 'content': '⚡ Searching local knowledge base...'})}\n\n"
            try:
                kb_results = await kb_vector_search(
                    keyword=query, results=8, source=True, note=True, minimum_score=0.2
                )
                if kb_results:
                    for i, r in enumerate(kb_results, 1):
                        if isinstance(r, dict):
                            title = r.get("title", f"KB Source {i}")
                            content = r.get("content", "")[:500]
                        else:
                            title = getattr(r, "title", f"KB Source {i}")
                            content = (getattr(r, "content", "") or "")[:500]
                        all_sources.append({"title": title, "url": "local://kb", "content": content})
                    yield f"data: {json.dumps({'type': 'status', 'content': f'Found {len(kb_results)} local KB results.'})}\n\n"
            except Exception as e:
                logger.warning(f"Local KB search in hybrid mode failed: {e}")

            # ── 2. Perplexity search (non-streaming to get structured result) ──
            if perplexity_key:
                yield f"data: {json.dumps({'type': 'status', 'content': '🌐 Querying Perplexity online search...'})}\n\n"
                try:
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        resp = await client.post(
                            "https://api.perplexity.ai/chat/completions",
                            headers={"Authorization": f"Bearer {perplexity_key}"},
                            json={
                                "model": "sonar",
                                "messages": [
                                    {"role": "system", "content": "Provide a comprehensive answer with citations."},
                                    {"role": "user", "content": query},
                                ],
                                "stream": False,
                            },
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            choices = data.get("choices", [])
                            if choices:
                                perplexity_analysis = choices[0].get("message", {}).get("content", "")
                            citations = data.get("citations", [])
                            for i, url in enumerate(citations, 1):
                                all_sources.append({"title": f"Perplexity Citation {i}", "url": url, "content": ""})
                            yield f"data: {json.dumps({'type': 'status', 'content': f'Perplexity returned {len(citations)} citations.'})}\n\n"
                        else:
                            logger.warning(f"Perplexity in hybrid returned {resp.status_code}")
                except Exception as e:
                    logger.warning(f"Perplexity search in hybrid mode failed: {e}")

            # ── 3. Valyu deep search ──
            if valyu_key:
                yield f"data: {json.dumps({'type': 'status', 'content': '🔬 Running Valyu deep research...'})}\n\n"
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        resp = await client.post(
                            "https://api.valyu.ai/v1/search",
                            headers={"Content-Type": "application/json", "X-API-Key": valyu_key},
                            json={
                                "query": query,
                                "search_type": "all",
                                "max_num_results": 6,
                                "response_length": "medium",
                            },
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            if data.get("success"):
                                valyu_results = data.get("results", [])
                                for r in valyu_results:
                                    all_sources.append({
                                        "title": r.get("title", "Valyu Source"),
                                        "url": r.get("url", ""),
                                        "content": r.get("content", ""),
                                    })
                                yield f"data: {json.dumps({'type': 'status', 'content': f'Valyu returned {len(valyu_results)} results.'})}\n\n"
                except Exception as e:
                    logger.warning(f"Valyu search in hybrid mode failed: {e}")

            # ── Deduplicate by URL ──
            seen_urls: set[str] = set()
            deduped_sources: List[Dict[str, Any]] = []
            for src in all_sources:
                url = src.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    deduped_sources.append(src)
                elif not url:
                    deduped_sources.append(src)

            if not deduped_sources:
                yield f"data: {json.dumps({'type': 'status', 'content': 'No results found from any engine. Synthesizing from prompt alone...'})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'sources', 'content': deduped_sources})}\n\n"
                yield f"data: {json.dumps({'type': 'status', 'content': f'Collected {len(deduped_sources)} unique results across all engines. Generating synthesis...'})}\n\n"

            # ── Build combined context ──
            search_context = ""
            for i, src in enumerate(deduped_sources, 1):
                search_context += f"[{i}] {src['title']}\\nURL: {src['url']}\\nContent: {src['content']}\n\n"

            if perplexity_analysis:
                search_context += f"\\n--- Perplexity Online Analysis ---\\n{perplexity_analysis}\\n"

            # ── Synthesize with LLM ──
            from open_notebook.ai.provision import provision_langchain_model

            final_user_prompt = f"Multi-Engine Search Context:\\n{search_context}\n\nOriginal Query:\\n{query}"

            llm_model = await provision_langchain_model(
                content=final_user_prompt, model_id=None, default_type="chat"
            )

            payload = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=final_user_prompt),
            ]

            accumulated_answer = ""
            async for chunk in llm_model.astream(payload):
                content = extract_text_content(chunk.content)
                if content:
                    accumulated_answer += content
                    yield f"data: {json.dumps({'type': 'answer', 'content': content})}\n\n"

            yield f"data: {json.dumps({'type': 'final_answer', 'content': accumulated_answer})}\n\n"
            yield f"data: {json.dumps({'type': 'complete', 'final_answer': accumulated_answer})}\n\n"

        # ─── Unsupported engine ───
        else:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Unsupported research engine: {engine}. Use local, perplexity, or hybrid.'})}\n\n"

    except Exception as e:
        logger.error(f"Error in research streaming: {str(e)}")
        yield f"data: {json.dumps({'type': 'error', 'message': f'Research failed: {str(e)}'})}\n\n"


@router.post("/search/research")
async def deep_research_endpoint(request: ResearchRequest):
    """Perform streaming research using Local KB, Perplexity, or Hybrid Multi-Engine."""
    return StreamingResponse(
        stream_research_response(
            query=request.query,
            engine=request.engine,
            transformation_id=request.transformation_id,
            model_id=request.model_id,
            custom_prompt=request.custom_prompt,
            output_formatting=request.output_formatting,
            styleguide_id=request.styleguide_id,
        ),
        media_type="text/plain",
    )

