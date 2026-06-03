"""
Voice Sessions API — CRUD for voice conversation sessions.

Reuses the existing ChatSession domain model from the notebook system,
adding voice-specific metadata (voice_mode, tts_voice) while sharing
the same underlying session infrastructure.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel, Field

from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.notebook import ChatSession, Note, Notebook

router = APIRouter()


# ── Models ───────────────────────────────────────────────────────────


class CreateVoiceSessionRequest(BaseModel):
    """Create a new voice chat session."""

    notebook_id: Optional[str] = Field(
        None, description="Optional notebook ID for scoped context"
    )
    title: Optional[str] = Field(
        default="Voice Conversation", description="Session title"
    )
    tts_voice: str = Field(
        default="af_heart", description="Default TTS voice for this session"
    )


class VoiceSessionResponse(BaseModel):
    """Voice session metadata."""

    id: str
    title: str
    notebook_id: Optional[str] = None
    created: str
    updated: str
    message_count: int = 0
    voice_mode: bool = True
    tts_voice: str = "af_heart"


class VoiceMessageRequest(BaseModel):
    """Add a message to a voice session."""

    role: str = Field(..., description="'human' or 'ai'")
    content: str = Field(..., description="Message text content")
    audio_url: Optional[str] = Field(None, description="URL to audio file if available")


class VoiceMessageResponse(BaseModel):
    """A single voice chat message."""

    role: str
    content: str
    audio_url: Optional[str] = None
    timestamp: Optional[str] = None


class VoiceSessionWithMessagesResponse(VoiceSessionResponse):
    """Voice session with full message history."""

    messages: List[VoiceMessageResponse] = Field(default_factory=list)


# ── Endpoints ────────────────────────────────────────────────────────


@router.get("/voice/sessions", response_model=List[VoiceSessionResponse])
async def list_voice_sessions(
    notebook_id: Optional[str] = Query(None, description="Filter by notebook ID"),
    limit: int = Query(default=20, ge=1, le=100),
):
    """
    List voice chat sessions, optionally filtered by notebook.
    Returns sessions marked as voice_mode=True.
    """
    try:
        if notebook_id:
            # Get sessions scoped to a notebook
            notebook = await Notebook.get(notebook_id)
            if not notebook:
                raise HTTPException(status_code=404, detail="Notebook not found")

            sessions = await notebook.get_chat_sessions()
            # Filter for voice sessions by checking title prefix or all
            results = []
            for s in sessions[:limit]:
                results.append(
                    VoiceSessionResponse(
                        id=s.id or "",
                        title=s.title or "Voice Conversation",
                        notebook_id=notebook_id,
                        created=str(s.created or ""),
                        updated=str(s.updated or ""),
                        voice_mode=True,
                        tts_voice="af_heart",
                    )
                )
            return results
        else:
            # Query all voice sessions (those with "Voice" in title or all recent)
            query = """
                SELECT * FROM chat_session
                WHERE title CONTAINS 'Voice' OR title CONTAINS 'voice'
                ORDER BY updated DESC
                LIMIT $limit
            """
            results_raw = await repo_query(query, {"limit": limit})
            results = []
            for r in results_raw:
                results.append(
                    VoiceSessionResponse(
                        id=r.get("id", ""),
                        title=r.get("title", "Voice Conversation"),
                        notebook_id=r.get("notebook_id"),
                        created=str(r.get("created", "")),
                        updated=str(r.get("updated", "")),
                        voice_mode=True,
                    )
                )
            return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing voice sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice/sessions", response_model=VoiceSessionResponse)
async def create_voice_session(request: CreateVoiceSessionRequest):
    """
    Create a new voice chat session.
    Reuses the ChatSession domain model with voice-specific metadata.
    """
    try:
        title = request.title or "Voice Conversation"
        # Prefix with 🎙️ to distinguish voice sessions
        if not title.startswith("🎙️"):
            title = f"🎙️ {title}"

        session = ChatSession(
            title=title,
        )

        # If notebook-scoped, associate with notebook
        if request.notebook_id:
            notebook = await Notebook.get(request.notebook_id)
            if not notebook:
                raise HTTPException(status_code=404, detail="Notebook not found")
            await session.save()
            await session.relate_to_notebook(request.notebook_id)
        else:
            await session.save()

        return VoiceSessionResponse(
            id=session.id or "",
            title=session.title or title,
            notebook_id=request.notebook_id,
            created=str(session.created or ""),
            updated=str(session.updated or ""),
            voice_mode=True,
            tts_voice=request.tts_voice,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating voice session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/voice/sessions/{session_id}", response_model=VoiceSessionWithMessagesResponse)
async def get_voice_session(session_id: str):
    """
    Get a voice session with its full message history.
    """
    try:
        session = await ChatSession.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Voice session not found")

        # Get messages from LangGraph state
        messages = []
        try:
            from open_notebook.graphs.chat import graph as chat_graph

            state = await chat_graph.aget_state(
                {"configurable": {"thread_id": session_id}}
            )
            if state and state.values:
                for msg in state.values.get("messages", []):
                    messages.append(
                        VoiceMessageResponse(
                            role="human" if msg.type == "human" else "ai",
                            content=msg.content if isinstance(msg.content, str) else str(msg.content),
                        )
                    )
        except Exception as e:
            logger.warning(f"Failed to load messages for voice session {session_id}: {e}")

        return VoiceSessionWithMessagesResponse(
            id=session.id or "",
            title=session.title or "Voice Conversation",
            created=str(session.created or ""),
            updated=str(session.updated or ""),
            message_count=len(messages),
            voice_mode=True,
            messages=messages,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting voice session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/voice/sessions/{session_id}")
async def delete_voice_session(session_id: str):
    """Delete a voice chat session."""
    try:
        session = await ChatSession.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Voice session not found")

        await session.delete()
        return {"success": True, "message": f"Voice session {session_id} deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting voice session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/voice/sessions/{session_id}/messages",
    response_model=VoiceMessageResponse,
)
async def add_voice_message(session_id: str, request: VoiceMessageRequest):
    """
    Add a message to a voice session.

    Persists via the LangGraph chat graph so messages are stored alongside
    regular chat messages and can be retrieved via get_voice_session.
    """
    try:
        session = await ChatSession.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Voice session not found")

        from langchain_core.messages import AIMessage, HumanMessage
        from langgraph.types import RunnableConfig

        from open_notebook.graphs.chat import graph as chat_graph

        full_session_id = ensure_record_id("chat_session", session_id)

        # Build the message object
        if request.role == "human":
            msg = HumanMessage(content=request.content)
        else:
            msg = AIMessage(content=request.content)

        # Get current state and append message
        state = await chat_graph.aget_state(
            {"configurable": {"thread_id": full_session_id}}
        )

        current_messages = []
        if state and state.values:
            current_messages = list(state.values.get("messages", []))
        current_messages.append(msg)

        # Update the graph state with the new message
        await chat_graph.aupdate_state(
            config=RunnableConfig(
                configurable={"thread_id": full_session_id}
            ),
            values={"messages": current_messages},
        )

        # Update session timestamp
        await session.save()

        return VoiceMessageResponse(
            role=request.role,
            content=request.content,
            audio_url=request.audio_url,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding voice message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SaveAsNoteRequest(BaseModel):
    """Save voice transcript as a notebook note."""

    notebook_id: str = Field(..., description="Notebook ID to save the note to")
    title: str = Field(default="Voice Transcript", description="Note title")
    content: str = Field(..., description="Transcript content (markdown)")


class SaveAsNoteResponse(BaseModel):
    success: bool
    note_id: Optional[str] = None
    message: str = ""


@router.post(
    "/voice/sessions/{session_id}/save-as-note",
    response_model=SaveAsNoteResponse,
)
async def save_session_as_note(session_id: str, request: SaveAsNoteRequest):
    """
    Save a voice session's transcript as a Note in a Notebook.

    Creates a new Note with the transcript content, saves it
    (which triggers auto-embedding), and relates it to the notebook.
    """
    try:
        # Verify notebook exists
        notebook = await Notebook.get(request.notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Create the note
        note = Note(
            title=request.title or f"🎙️ Voice Transcript",
            content=request.content,
            note_type="ai",
        )

        # Save triggers auto-embedding via submit_command
        await note.save()

        # Relate note to notebook
        await note.add_to_notebook(request.notebook_id)

        logger.info(
            f"Saved voice transcript as note {note.id} in notebook {request.notebook_id}"
        )

        return SaveAsNoteResponse(
            success=True,
            note_id=note.id,
            message=f"Transcript saved as note in notebook",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving voice transcript as note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

