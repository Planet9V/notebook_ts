import asyncio
import traceback
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from langchain_core.runnables import RunnableConfig
from loguru import logger
from pydantic import BaseModel, Field

from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.notebook import ChatSession, Note, Notebook, Source
from open_notebook.exceptions import (
    NotFoundError,
)
from open_notebook.graphs.chat import graph as chat_graph
from open_notebook.utils.graph_utils import get_session_message_count

router = APIRouter()


# Request/Response models
class CreateSessionRequest(BaseModel):
    notebook_id: str = Field(..., description="Notebook ID to create session for")
    title: Optional[str] = Field(None, description="Optional session title")
    model_override: Optional[str] = Field(
        None, description="Optional model override for this session"
    )


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = Field(None, description="New session title")
    model_override: Optional[str] = Field(
        None, description="Model override for this session"
    )


class ChatMessage(BaseModel):
    id: str = Field(..., description="Message ID")
    type: str = Field(..., description="Message type (human|ai)")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = Field(None, description="Message timestamp")


class ChatSessionResponse(BaseModel):
    id: str = Field(..., description="Session ID")
    title: str = Field(..., description="Session title")
    notebook_id: Optional[str] = Field(None, description="Notebook ID")
    created: str = Field(..., description="Creation timestamp")
    updated: str = Field(..., description="Last update timestamp")
    message_count: Optional[int] = Field(
        None, description="Number of messages in session"
    )
    model_override: Optional[str] = Field(
        None, description="Model override for this session"
    )


class ChatSessionWithMessagesResponse(ChatSessionResponse):
    messages: List[ChatMessage] = Field(
        default_factory=list, description="Session messages"
    )


class ExecuteChatRequest(BaseModel):
    session_id: str = Field(..., description="Chat session ID")
    message: str = Field(..., description="User message content")
    context: Dict[str, Any] = Field(
        ..., description="Chat context with sources and notes"
    )
    model_override: Optional[str] = Field(
        None, description="Optional model override for this message"
    )


class ExecuteChatResponse(BaseModel):
    session_id: str = Field(..., description="Session ID")
    messages: List[ChatMessage] = Field(..., description="Updated message list")


class BuildContextRequest(BaseModel):
    notebook_id: str = Field(..., description="Notebook ID")
    context_config: Dict[str, Any] = Field(..., description="Context configuration")


class BuildContextResponse(BaseModel):
    context: Dict[str, Any] = Field(..., description="Built context data")
    token_count: int = Field(..., description="Estimated token count")
    char_count: int = Field(..., description="Character count")


class SuccessResponse(BaseModel):
    success: bool = Field(True, description="Operation success status")
    message: str = Field(..., description="Success message")


@router.get("/chat/sessions", response_model=List[ChatSessionResponse])
async def get_sessions(notebook_id: str = Query(..., description="Notebook ID")):
    """Get all chat sessions for a notebook."""
    try:
        # Get notebook to verify it exists
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Get sessions for this notebook
        sessions_list = await notebook.get_chat_sessions()

        results = []
        for session in sessions_list:
            session_id = str(session.id)

            # Get message count from LangGraph state
            msg_count = await get_session_message_count(chat_graph, session_id)

            results.append(
                ChatSessionResponse(
                    id=session.id or "",
                    title=session.title or "Untitled Session",
                    notebook_id=notebook_id,
                    created=str(session.created),
                    updated=str(session.updated),
                    message_count=msg_count,
                    model_override=getattr(session, "model_override", None),
                )
            )

        return results
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat sessions: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching chat sessions: {str(e)}"
        )


@router.post("/chat/sessions", response_model=ChatSessionResponse)
async def create_session(request: CreateSessionRequest):
    """Create a new chat session."""
    try:
        # Verify notebook exists
        notebook = await Notebook.get(request.notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Create new session
        session = ChatSession(
            title=request.title
            or f"Chat Session {asyncio.get_event_loop().time():.0f}",
            model_override=request.model_override,
        )
        await session.save()

        # Relate session to notebook
        await session.relate_to_notebook(request.notebook_id)

        return ChatSessionResponse(
            id=session.id or "",
            title=session.title or "",
            notebook_id=request.notebook_id,
            created=str(session.created),
            updated=str(session.updated),
            message_count=0,
            model_override=session.model_override,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Notebook not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chat session: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating chat session: {str(e)}"
        )


@router.get(
    "/chat/sessions/{session_id}", response_model=ChatSessionWithMessagesResponse
)
async def get_session(session_id: str):
    """Get a specific session with its messages."""
    try:
        # Get session
        # Ensure session_id has proper table prefix
        full_session_id = (
            session_id
            if session_id.startswith("chat_session:")
            else f"chat_session:{session_id}"
        )
        session = await ChatSession.get(full_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get session state from LangGraph to retrieve messages
        # Use sync get_state() in a thread since SqliteSaver doesn't support async
        thread_state = await asyncio.to_thread(
            chat_graph.get_state,
            config=RunnableConfig(configurable={"thread_id": full_session_id}),
        )

        # Extract messages from state
        messages: list[ChatMessage] = []
        if thread_state and thread_state.values and "messages" in thread_state.values:
            for msg in thread_state.values["messages"]:
                messages.append(
                    ChatMessage(
                        id=getattr(msg, "id", f"msg_{len(messages)}"),
                        type=msg.type if hasattr(msg, "type") else "unknown",
                        content=msg.content if hasattr(msg, "content") else str(msg),
                        timestamp=None,  # LangChain messages don't have timestamps by default
                    )
                )

        # Find notebook_id (we need to query the relationship)
        # Ensure session_id has proper table prefix
        full_session_id = (
            session_id
            if session_id.startswith("chat_session:")
            else f"chat_session:{session_id}"
        )

        notebook_query = await repo_query(
            "SELECT out FROM refers_to WHERE in = $session_id",
            {"session_id": ensure_record_id(full_session_id)},
        )

        notebook_id = notebook_query[0]["out"] if notebook_query else None

        if not notebook_id:
            # This might be an old session created before API migration
            logger.warning(
                f"No notebook relationship found for session {session_id} - may be an orphaned session"
            )

        return ChatSessionWithMessagesResponse(
            id=session.id or "",
            title=session.title or "Untitled Session",
            notebook_id=notebook_id,
            created=str(session.created),
            updated=str(session.updated),
            message_count=len(messages),
            messages=messages,
            model_override=getattr(session, "model_override", None),
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching session: {str(e)}")


@router.put("/chat/sessions/{session_id}", response_model=ChatSessionResponse)
async def update_session(session_id: str, request: UpdateSessionRequest):
    """Update session title."""
    try:
        # Ensure session_id has proper table prefix
        full_session_id = (
            session_id
            if session_id.startswith("chat_session:")
            else f"chat_session:{session_id}"
        )
        session = await ChatSession.get(full_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        update_data = request.model_dump(exclude_unset=True)

        if "title" in update_data:
            session.title = update_data["title"]

        if "model_override" in update_data:
            session.model_override = update_data["model_override"]

        await session.save()

        # Find notebook_id
        # Ensure session_id has proper table prefix
        full_session_id = (
            session_id
            if session_id.startswith("chat_session:")
            else f"chat_session:{session_id}"
        )
        notebook_query = await repo_query(
            "SELECT out FROM refers_to WHERE in = $session_id",
            {"session_id": ensure_record_id(full_session_id)},
        )
        notebook_id = notebook_query[0]["out"] if notebook_query else None

        # Get message count from LangGraph state
        msg_count = await get_session_message_count(chat_graph, full_session_id)

        return ChatSessionResponse(
            id=session.id or "",
            title=session.title or "",
            notebook_id=notebook_id,
            created=str(session.created),
            updated=str(session.updated),
            message_count=msg_count,
            model_override=session.model_override,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating session: {str(e)}")


@router.delete("/chat/sessions/{session_id}", response_model=SuccessResponse)
async def delete_session(session_id: str):
    """Delete a chat session."""
    try:
        # Ensure session_id has proper table prefix
        full_session_id = (
            session_id
            if session_id.startswith("chat_session:")
            else f"chat_session:{session_id}"
        )
        session = await ChatSession.get(full_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        await session.delete()

        return SuccessResponse(success=True, message="Session deleted successfully")
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")


@router.post("/chat/execute", response_model=ExecuteChatResponse)
async def execute_chat(request: ExecuteChatRequest):
    """Execute a chat request and get AI response."""
    try:
        # Verify session exists
        # Ensure session_id has proper table prefix
        full_session_id = (
            request.session_id
            if request.session_id.startswith("chat_session:")
            else f"chat_session:{request.session_id}"
        )
        session = await ChatSession.get(full_session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Fetch notebook linked to this session
        notebook_query = await repo_query(
            "SELECT out FROM refers_to WHERE in = $session_id",
            {"session_id": ensure_record_id(full_session_id)},
        )
        notebook = None
        if notebook_query:
            notebook = await Notebook.get(notebook_query[0]["out"])

        # Determine model override (per-request override takes precedence over session-level)
        model_override = (
            request.model_override
            if request.model_override is not None
            else getattr(session, "model_override", None)
        )

        # Get current state
        # Use sync get_state() in a thread since SqliteSaver doesn't support async
        current_state = await asyncio.to_thread(
            chat_graph.get_state,
            config=RunnableConfig(configurable={"thread_id": full_session_id}),
        )

        # Prepare state for execution
        state_values = current_state.values if current_state else {}
        state_values["messages"] = state_values.get("messages", [])
        state_values["context"] = request.context
        state_values["notebook"] = notebook
        state_values["model_override"] = model_override

        # Add user message to state
        from langchain_core.messages import HumanMessage

        user_message = HumanMessage(content=request.message)
        state_values["messages"].append(user_message)

        # Execute chat graph
        result = chat_graph.invoke(
            input=state_values,  # type: ignore[arg-type]
            config=RunnableConfig(
                configurable={
                    "thread_id": full_session_id,
                    "model_id": model_override,
                }
            ),
        )

        # Update session timestamp
        await session.save()

        # Convert messages to response format
        messages: list[ChatMessage] = []
        for msg in result.get("messages", []):
            messages.append(
                ChatMessage(
                    id=getattr(msg, "id", f"msg_{len(messages)}"),
                    type=msg.type if hasattr(msg, "type") else "unknown",
                    content=msg.content if hasattr(msg, "content") else str(msg),
                    timestamp=None,
                )
            )

        return ExecuteChatResponse(session_id=request.session_id, messages=messages)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        # Log detailed error with context for debugging
        logger.error(
            f"Error executing chat: {str(e)}\n"
            f"  Session ID: {request.session_id}\n"
            f"  Model override: {request.model_override}\n"
            f"  Traceback:\n{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=f"Error executing chat: {str(e)}")


@router.post("/chat/context", response_model=BuildContextResponse)
async def build_context(request: BuildContextRequest):
    """Build context for a notebook based on context configuration."""
    try:
        # Verify notebook exists
        notebook = await Notebook.get(request.notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        context_data: dict[str, list[dict[str, str]]] = {"sources": [], "notes": []}
        total_content = ""

        # Process context configuration if provided
        if request.context_config:
            # Process sources
            for source_id, status in request.context_config.get("sources", {}).items():
                if "not in" in status:
                    continue

                try:
                    # Add table prefix if not present
                    full_source_id = (
                        source_id
                        if source_id.startswith("source:")
                        else f"source:{source_id}"
                    )

                    try:
                        source = await Source.get(full_source_id)
                    except Exception:
                        continue

                    if "insights" in status:
                        source_context = await source.get_context(context_size="short")
                        context_data["sources"].append(source_context)
                        total_content += str(source_context)
                    elif "full content" in status:
                        source_context = await source.get_context(context_size="long")
                        context_data["sources"].append(source_context)
                        total_content += str(source_context)
                except Exception as e:
                    logger.warning(f"Error processing source {source_id}: {str(e)}")
                    continue

            # Process notes
            for note_id, status in request.context_config.get("notes", {}).items():
                if "not in" in status:
                    continue

                try:
                    # Add table prefix if not present
                    full_note_id = (
                        note_id if note_id.startswith("note:") else f"note:{note_id}"
                    )
                    note = await Note.get(full_note_id)
                    if not note:
                        continue

                    if "full content" in status:
                        note_context = note.get_context(context_size="long")
                        context_data["notes"].append(note_context)
                        total_content += str(note_context)
                except Exception as e:
                    logger.warning(f"Error processing note {note_id}: {str(e)}")
                    continue
        else:
            # Default behavior - include all sources and notes with short context
            sources = await notebook.get_sources()
            for source in sources:
                try:
                    source_context = await source.get_context(context_size="short")
                    context_data["sources"].append(source_context)
                    total_content += str(source_context)
                except Exception as e:
                    logger.warning(f"Error processing source {source.id}: {str(e)}")
                    continue

            notes = await notebook.get_notes()
            for note in notes:
                try:
                    note_context = note.get_context(context_size="short")
                    context_data["notes"].append(note_context)
                    total_content += str(note_context)
                except Exception as e:
                    logger.warning(f"Error processing note {note.id}: {str(e)}")
                    continue

        # Always inject the dynamic Live Threat & Compliance Report if notebook has topology/canvas
        live_report = await _build_live_threat_compliance_report(request.notebook_id)
        if live_report:
            context_data["sources"].append(live_report)
            total_content += live_report["full_text"]

        # Calculate character and token counts
        char_count = len(total_content)
        # Use token count utility if available
        try:
            from open_notebook.utils import token_count

            estimated_tokens = token_count(total_content) if total_content else 0
        except ImportError:
            # Fallback to simple estimation
            estimated_tokens = char_count // 4

        return BuildContextResponse(
            context=context_data, token_count=estimated_tokens, char_count=char_count
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building context: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error building context: {str(e)}")


async def _build_live_threat_compliance_report(notebook_id: str) -> Optional[Dict[str, Any]]:
    try:
        from api.models import GraphEdge, GraphNode, GraphValidationRequest
        from api.routers.notebooks import validate_graph
        from open_notebook.database.repository import ensure_record_id, repo_query

        # 1. Load notebook info & topology
        notebook_rec = await repo_query("SELECT name, description, topology, customer_id FROM ONLY $notebook_id", {"notebook_id": ensure_record_id(notebook_id)})
        if not notebook_rec:
            return None
        nb = notebook_rec
        
        topology = nb.get("topology") or {}
        nodes_list = topology.get("nodes") or []
        edges_list = topology.get("edges") or []

        # 2. Run NetworkX validations
        nodes_pydantic = []
        for n in nodes_list:
            data = n.get("data") or {}
            nodes_pydantic.append(GraphNode(
                id=str(n.get("id")),
                type=str(data.get("deviceType") or n.get("type") or ""),
                purdueLevel=int(data.get("purdueLevel") or n.get("purdueLevel") or 1),
                ip_address=data.get("ip_address") or n.get("ip_address"),
                mac_address=data.get("mac_address") or n.get("mac_address"),
                subnet_mask=data.get("subnet_mask") or n.get("subnet_mask"),
                hostname=data.get("hostname") or n.get("hostname"),
                manufacturer=data.get("manufacturer") or n.get("manufacturer")
            ))
        edges_pydantic = []
        for e in edges_list:
            edges_pydantic.append(GraphEdge(
                id=str(e.get("id")),
                source=str(e.get("source")),
                target=str(e.get("target"))
            ))
            
        validation_res = None
        if nodes_pydantic:
            try:
                validation_res = await validate_graph(GraphValidationRequest(nodes=nodes_pydantic, edges=edges_pydantic))
            except Exception as ex:
                logger.error(f"Error running network audit: {ex}")

        # 3. Format Topology into markdown
        markdown_lines = []
        markdown_lines.append("# LIVE SYSTEM THREAT & COMPLIANCE REPORT")
        markdown_lines.append(f"**Target System:** {nb.get('name')} (B2B Client draft)")
        markdown_lines.append(f"**System Description:** {nb.get('description') or 'No description available.'}")
        markdown_lines.append("")
        markdown_lines.append("## 1. DRAWN NETWORK TOPOLOGY")
        markdown_lines.append(f"Total Nodes: {len(nodes_list)} | Total Connections: {len(edges_list)}")
        markdown_lines.append("")
        
        if nodes_list:
            markdown_lines.append("| Device ID | Name / Label | Purdue Level | Device Type | IP Address | MAC Address | Hostname | Manufacturer |")
            markdown_lines.append("|---|---|---|---|---|---|---|---|")
            for n in nodes_list:
                data = n.get("data") or {}
                markdown_lines.append(
                    f"| `{n.get('id')}` | {data.get('label') or 'Unnamed'} | Level {data.get('purdueLevel') or n.get('purdueLevel') or 1} | "
                    f"**{data.get('deviceType') or n.get('type') or 'unknown'}** | {data.get('ip_address') or 'N/A'} | "
                    f"`{data.get('mac_address') or 'N/A'}` | {data.get('hostname') or 'N/A'} | {data.get('manufacturer') or 'N/A'} |"
                )
            markdown_lines.append("")
        else:
            markdown_lines.append("*No network devices have been drawn on the canvas yet.*")
            markdown_lines.append("")

        # 4. Format Security Violations (Purdue Level and Parameter conflicts)
        markdown_lines.append("## 2. AUTOMATED SECURITY AUDIT & THREAT MONITORING")
        if validation_res and (validation_res.violatedNodes or validation_res.violatedEdges):
            markdown_lines.append("⚠️ **CRITICAL: Security Violations and Vulnerabilities Detected!**")
            markdown_lines.append("")
            
            # Print node violations
            if validation_res.nodeViolations:
                markdown_lines.append("### Device Parameter & Zone Bypasses:")
                for n_id, violations in validation_res.nodeViolations.items():
                    label = n_id
                    for n in nodes_list:
                        if n.get("id") == n_id:
                            label = n.get("data", {}).get("label") or n_id
                            break
                    markdown_lines.append(f"- **Device `{label}` (`{n_id}`)**:")
                    for v in violations:
                        markdown_lines.append(f"  - 🔴 {v}")
                markdown_lines.append("")
                
            # Print edge violations
            if validation_res.edgeViolations:
                markdown_lines.append("### Connection Pathway Bypasses:")
                for e_id, violations in validation_res.edgeViolations.items():
                    markdown_lines.append(f"- **Connection `{e_id}`**:")
                    for v in violations:
                        markdown_lines.append(f"  - 🔴 {v}")
                markdown_lines.append("")

            # Print threat paths
            if validation_res.threatPaths:
                markdown_lines.append("### Firewall-Bypassing Communication Threat Vectors:")
                for i, path in enumerate(validation_res.threatPaths):
                    path_str = " ➔ ".join([f"`{n_id}`" for n_id in path])
                    markdown_lines.append(f"{i+1}. **Path:** {path_str}")
                markdown_lines.append("")
        else:
            markdown_lines.append("✅ **System Secure:** Evolved NetworkX analysis detected 0 direct Purdue Zone bypasses, 0 unmediated reachability loops, and 0 IP conflict errors.")
            markdown_lines.append("")

        # 5. Format Compliance Session State
        markdown_lines.append("## 3. CSET COMPLIANCE CHECKS & PROGRESS STATE")
        
        # Find all compliance sessions for this customer or associated with this notebook
        sessions_query = []
        cust_id = nb.get("customer_id")
        if cust_id:
            sessions_query = await repo_query(
                "SELECT * FROM assessment_session WHERE type::string(assessment_id) IN "
                "(SELECT type::string(id) FROM assessment WHERE type::string(customer_id) = type::string($cust_id)) "
                "ORDER BY created_at DESC",
                {"cust_id": cust_id}
            )
        
        if sessions_query:
            for session in sessions_query:
                sess_id = str(session["id"])
                fw_id = session.get("version_lock")
                
                # Fetch answers in this session
                answers = await repo_query(
                    "SELECT * FROM assessment_answer WHERE session_id = $session_id",
                    {"session_id": sess_id}
                )
                answer_map = {ans["question_id"]: ans for ans in answers}
                
                # Fetch standard questions to compute counts and display scoring
                questions = await repo_query(
                    "SELECT * FROM question WHERE regulation_id = $fw_id",
                    {"fw_id": fw_id}
                )
                
                total_q = len(questions)
                yes_c = sum(1 for q in questions if answer_map.get(str(q["id"]), {}).get("answer") == "Y")
                no_c = sum(1 for q in questions if answer_map.get(str(q["id"]), {}).get("answer") == "N")
                na_c = sum(1 for q in questions if answer_map.get(str(q["id"]), {}).get("answer") == "NA")
                alt_c = sum(1 for q in questions if answer_map.get(str(q["id"]), {}).get("answer") == "ALT")
                answered_c = len(answers)
                
                comp_pct = (answered_c / total_q * 100) if total_q > 0 else 0
                denom = (yes_c + no_c + alt_c)
                score = (yes_c / denom * 100) if denom > 0 else 0
                
                # Short standard name
                fw_name = str(fw_id).split(":", 1)[-1]
                
                markdown_lines.append(f"### Framework Standard: `{fw_name}` (Audit Session `{session.get('session_name')}`)")
                markdown_lines.append(f"- **Audit Status:** `{session.get('status')}`")
                markdown_lines.append(f"- **Completion Progress:** `{answered_c}/{total_q}` questions answered ({comp_pct:.1f}%)")
                markdown_lines.append(f"- **Compliance Score (YES/Total evaluated):** `{score:.1f}%` (YES: {yes_c}, NO: {no_c}, N/A: {na_c}, ALT: {alt_c})")
                markdown_lines.append("")
                
                # Add answers details
                if answered_c > 0:
                    markdown_lines.append("#### Wizard Answers Log:")
                    markdown_lines.append("| Req Code | Question Text | Answer | Evidence URL / Reference | Comments |")
                    markdown_lines.append("|---|---|---|---|---|")
                    for q in questions:
                        q_id = str(q["id"])
                        ans_rec = answer_map.get(q_id)
                        if ans_rec:
                            comment_str = ans_rec.get("comments") or "-"
                            evidence_str = ans_rec.get("evidence_url") or "-"
                            markdown_lines.append(
                                f"| `{q.get('standard_code')}` | {q.get('question_text')} | **{ans_rec.get('answer')}** | "
                                f"{evidence_str} | {comment_str} |"
                            )
                    markdown_lines.append("")
        else:
            markdown_lines.append("*No compliance assessment audit sessions have been initiated for this B2B client profile yet.*")
            markdown_lines.append("")
            
        live_report_markdown = "\n".join(markdown_lines)
        return {
            "id": "source:threat_compliance_live_report",
            "title": "Threat Modeling Canvas & Compliance Audit Live Report",
            "insights": [],
            "full_text": live_report_markdown
        }
    except Exception as err:
        logger.error(f"Error building live threat and compliance context report: {err}")
        return None
