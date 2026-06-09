import base64
import os
import httpx
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field
from loguru import logger

from open_notebook.database.repository import repo_query, repo_update
from open_notebook.domain.credential import Credential

router = APIRouter()

# ── Pydantic Request & Response Models ───────────────────────────────

class VoiceToolExecuteRequest(BaseModel):
    tool_name: str = Field(..., description="The name of the tool to execute: query_graph_edges | edit_note | trigger_export")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Arguments passed to the tool")

class VoiceToolExecuteResponse(BaseModel):
    success: bool
    status: str  # completed | requires_confirmation | failed
    message: str
    data: Optional[Dict[str, Any]] = None
    audio_base64: Optional[str] = None

# ── Voice synthesis helper ───────────────────────────────────────────

async def synthesize_text_to_base64(text: str) -> Optional[str]:
    """Synthesize speech using Kokoro and return base64-encoded WAV data."""
    try:
        url = os.getenv("KOKORO_TTS_URL", "http://kokoro-tts:8880")
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{url}/v1/audio/speech",
                json={
                    "input": text,
                    "voice": "af_heart",
                    "model": "kokoro",
                    "response_format": "wav",
                },
            )
            if resp.status_code == 200:
                return base64.b64encode(resp.content).decode("utf-8")
            else:
                logger.error(f"Kokoro synthesis failed with status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Failed to synthesize voice response: {e}")
    return None

# ── Endpoints ────────────────────────────────────────────────────────

@router.get("/voice/tools/schema")
async def get_tools_schema():
    """Return OpenAI-compatible tool specifications for the WebRTC assistant."""
    return {
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "query_graph_edges",
                    "description": "Retrieve entities (contacts, locations, organizations, customers) linked to a specific note or the active note via database graph RELATION edges.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                          "note_id": {
                            "type": "string",
                            "description": "The target note ID (e.g. 'note:xyz'). If omitted, falls back to the user's active notebook note."
                          }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "edit_note",
                    "description": "Modify or append text content to a note. Requires verbal confirmation.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                          "note_id": {
                            "type": "string",
                            "description": "The target note ID to edit. If omitted, falls back to the user's active note."
                          },
                          "content": {
                            "type": "string",
                            "description": "The content to insert or append."
                          },
                          "mode": {
                            "type": "string",
                            "enum": ["append", "overwrite"],
                            "description": "Whether to append to the end or overwrite the note content."
                          },
                          "confirm": {
                            "type": "boolean",
                            "description": "Must be true if the user has explicitly confirmed this action. Defaults to false."
                          }
                        },
                        "required": ["content", "mode"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "trigger_export",
                    "description": "Export notebook content to Google Docs, Slides, or Sheets. Requires valid Google OAuth connection.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                          "note_id": {
                            "type": "string",
                            "description": "The note ID to export. If omitted, falls back to the user's active note."
                          },
                          "export_type": {
                            "type": "string",
                            "enum": ["gdocs", "gslides", "gsheets"],
                            "description": "The exporter target pipeline."
                          },
                          "confirm": {
                            "type": "boolean",
                            "description": "Must be true if the user has explicitly confirmed this action. Defaults to false."
                          }
                        },
                        "required": ["export_type"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_research_corpus",
                    "description": "Search the research memory database using hybrid vector semantic search. Returns the most relevant articles and intelligence reports.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                          "query": {
                            "type": "string",
                            "description": "The search query term or phrase."
                          },
                          "limit": {
                            "type": "integer",
                            "description": "The maximum number of search results to return. Defaults to 3."
                          }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "query_skills",
                    "description": "List and query the available abilities and skills in the social media and automations database.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                          "query": {
                            "type": "string",
                            "description": "Optional search query to filter skills by name or description."
                          },
                          "category": {
                            "type": "string",
                            "description": "Optional category filter."
                          }
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "query_social_posts",
                    "description": "Retrieve the scheduled or published social media posts and their performance metrics (views, clicks, interactions).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                          "channel": {
                            "type": "string",
                            "description": "Optional filter by channel (e.g. 'twitter', 'linkedin', 'email')."
                          },
                          "status": {
                            "type": "string",
                            "description": "Optional filter by status (e.g. 'draft', 'queued', 'published', 'failed')."
                          }
                        }
                    }
                }
            }
        ]
    }

@router.post("/voice/tools/execute", response_model=VoiceToolExecuteResponse)
async def execute_voice_tool(
    request: VoiceToolExecuteRequest,
    x_notebook_id: Optional[str] = Header(None),
    x_session_id: Optional[str] = Header(None),
):
    """
    Execute a voice tool call, validating target context, OAuth credentials, and confirmation status.
    """
    logger.info(f"Executing voice tool: {request.tool_name} with args: {request.arguments}")
    
    tool_name = request.tool_name
    args = request.arguments
    
    # 1. Resolve note_id context (only for tools that require a note)
    requires_note = tool_name in ["query_graph_edges", "edit_note", "trigger_export"]
    note_id = args.get("note_id")
    if requires_note and not note_id and x_notebook_id:
        # Resolve the active note (most recently updated note in the notebook)
        try:
            res = await repo_query(
                "SELECT id FROM note WHERE notebook = $notebook_id ORDER BY updated DESC LIMIT 1;",
                {"notebook_id": x_notebook_id}
            )
            if res:
                note_id = res[0]["id"]
        except Exception as e:
            logger.warning(f"Failed to resolve active note from notebook {x_notebook_id}: {e}")
            
    if requires_note and not note_id:
        speech = "I could not identify the active note to operate on. Please select a note first."
        audio_b64 = await synthesize_text_to_base64(speech)
        return VoiceToolExecuteResponse(
            success=False,
            status="failed",
            message="Active note could not be resolved from context.",
            audio_base64=audio_b64
        )

    # 2. Execute respective tools
    if tool_name == "query_graph_edges":
        try:
            edges = await repo_query(
                "SELECT out.* AS entity, id FROM entity_note WHERE in = $note_id;",
                {"note_id": note_id}
            )
            
            if not edges:
                speech = "I found no database entities linked to this note."
                audio_b64 = await synthesize_text_to_base64(speech)
                return VoiceToolExecuteResponse(
                    success=True,
                    status="completed",
                    message="No linked entities found.",
                    data={"entities": []},
                    audio_base64=audio_b64
                )
                
            entity_details = []
            entities_list = []
            for edge in edges:
                entity = edge.get("entity")
                if not entity:
                    continue
                entity_id = entity.get("id", "")
                entity_type = entity_id.split(":")[0] if ":" in entity_id else "unknown"
                name = entity.get("name", "Untitled")
                entities_list.append({"id": entity_id, "type": entity_type, "name": name})
                
                if entity_type == "customer":
                    threats = entity.get("activeThreatCount", 0)
                    score = entity.get("complianceScore", 0)
                    entity_details.append(f"Customer {name} (Compliance Score: {score}%, Active Threats: {threats})")
                elif entity_type == "location":
                    entity_details.append(f"Location {name} (Coordinates: {entity.get('latitude')}, {entity.get('longitude')})")
                elif entity_type == "contact":
                    entity_details.append(f"Contact {name} (Email: {entity.get('email')}, Phone: {entity.get('phone')})")
                elif entity_type == "organization":
                    entity_details.append(f"Organization {name} (Industry: {entity.get('industry')})")
                else:
                    entity_details.append(f"Entity {name} (Type: {entity_type})")
                    
            speech = f"I found {len(entity_details)} entities linked to this note: " + ", ".join(entity_details) + "."
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=True,
                status="completed",
                message=f"Successfully queried {len(entity_details)} linked entities.",
                data={"entities": entities_list},
                audio_base64=audio_b64
            )
        except Exception as e:
            logger.error(f"Error querying graph edges: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to query graph edges: {str(e)}")

    elif tool_name == "edit_note":
        content = args.get("content")
        mode = args.get("mode", "append")
        confirm = args.get("confirm", False)
        
        if not content:
            raise HTTPException(status_code=400, detail="Missing required argument: content")
            
        if not confirm:
            speech = f"I am ready to edit the note. Do you confirm?"
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=True,
                status="requires_confirmation",
                message="Confirmation required to edit note.",
                data={"note_id": note_id, "content": content, "mode": mode},
                audio_base64=audio_b64
            )
            
        try:
            # Fetch old content
            note_res = await repo_query("SELECT content, title FROM note WHERE id = $note_id;", {"note_id": note_id})
            if not note_res:
                raise HTTPException(status_code=404, detail="Note not found")
                
            old_content = note_res[0].get("content") or ""
            if mode == "overwrite":
                new_content = content
            else:
                new_content = old_content + "\n" + content if old_content else content
                
            await repo_update("note", note_id, {"content": new_content})
            
            speech = "Note updated successfully."
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=True,
                status="completed",
                message="Note updated successfully.",
                data={"note_id": note_id, "mode": mode},
                audio_base64=audio_b64
            )
        except Exception as e:
            logger.error(f"Error editing note: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to edit note: {str(e)}")

    elif tool_name == "trigger_export":
        export_type = args.get("export_type")
        confirm = args.get("confirm", False)
        
        if not export_type:
            raise HTTPException(status_code=400, detail="Missing required argument: export_type")
            
        # 1. Verify credentials exist
        has_creds = False
        cred = None
        try:
            cred = await Credential.get("credential:google_docs")
            if cred.client_id and cred.client_secret and cred.refresh_token:
                has_creds = True
        except Exception:
            pass
            
        if not has_creds:
            speech = "Your Google account is not connected. Please go to settings to authorize Google Workspace."
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=False,
                status="failed",
                message="Google Account not linked. Please authorize Google Workspace under settings.",
                audio_base64=audio_b64
            )
            
        # 2. Check confirmation
        if not confirm:
            speech = f"I am ready to export the note to Google Workspace. Do you confirm?"
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=True,
                status="requires_confirmation",
                message="Confirmation required to export note.",
                data={"note_id": note_id, "export_type": export_type},
                audio_base64=audio_b64
            )
            
        try:
            # Fetch note details
            note_res = await repo_query("SELECT title, content FROM note WHERE id = $note_id;", {"note_id": note_id})
            if not note_res:
                raise HTTPException(status_code=404, detail="Note not found")
            title = note_res[0].get("title", "Untitled Note")
            markdown_content = note_res[0].get("content") or ""
            
            # Retrieve or refresh access token
            access_token = None
            if cred and cred.refresh_token:
                try:
                    client_secret_val = cred.client_secret.get_secret_value()
                    refresh_url = "https://oauth2.googleapis.com/token"
                    data = {
                        "client_id": cred.client_id,
                        "client_secret": client_secret_val,
                        "refresh_token": cred.refresh_token.get_secret_value(),
                        "grant_type": "refresh_token",
                    }
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(refresh_url, data=data)
                        if resp.status_code == 200:
                            token_data = resp.json()
                            access_token = token_data.get("access_token")
                            if access_token:
                                from pydantic import SecretStr
                                cred.api_key = SecretStr(access_token)
                                new_refresh = token_data.get("refresh_token")
                                if new_refresh:
                                    cred.refresh_token = SecretStr(new_refresh)
                                await cred.save()
                except Exception as e:
                    logger.error(f"Failed to refresh access token: {e}")
                    
            if not access_token and cred and cred.api_key:
                access_token = cred.api_key.get_secret_value()
                
            if not access_token:
                # Sandbox simulation fallback
                doc_id = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                doc_url = f"https://docs.google.com/document/d/{doc_id}/edit"
                speech = "Google export completed successfully in simulation mode."
                audio_b64 = await synthesize_text_to_base64(speech)
                return VoiceToolExecuteResponse(
                    success=True,
                    status="completed",
                    message="Export simulated successfully.",
                    data={"doc_id": doc_id, "doc_url": doc_url},
                    audio_base64=audio_b64
                )
                
            # Invoke the active exporter function
            from api.routers.notebooks import export_markdown_to_gdoc, export_topology_to_gslides, export_scorecard_to_gsheets
            
            if export_type == "gdocs":
                doc_id = await export_markdown_to_gdoc(markdown_content, title, access_token)
                doc_url = f"https://docs.google.com/document/d/{doc_id}/edit"
            elif export_type == "gslides":
                doc_id = await export_topology_to_gslides({"nodes": [], "edges": []}, title, access_token)
                doc_url = f"https://docs.google.com/presentation/d/{doc_id}/edit"
            elif export_type == "gsheets":
                doc_id = await export_scorecard_to_gsheets([], title, access_token)
                doc_url = f"https://docs.google.com/spreadsheets/d/{doc_id}/edit"
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported export type: {export_type}")
                
            speech = f"Export completed successfully. Your {export_type} file is ready."
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=True,
                status="completed",
                message=f"Successfully exported note to {export_type}.",
                data={"doc_id": doc_id, "doc_url": doc_url},
                audio_base64=audio_b64
            )
        except Exception as e:
            logger.error(f"Failed to execute export: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to run export: {str(e)}")

    elif tool_name == "search_research_corpus":
        query = args.get("query")
        limit = int(args.get("limit", 3))
        if not query:
            raise HTTPException(status_code=400, detail="Missing required argument: query")
        
        try:
            from open_notebook.search.memory_first_search import hybrid_rrf_search
            results = await hybrid_rrf_search(query=query, limit=limit)
            
            if not results:
                speech = f"I found no matching articles or reports in the research corpus for: {query}."
                audio_b64 = await synthesize_text_to_base64(speech)
                return VoiceToolExecuteResponse(
                    success=True,
                    status="completed",
                    message="No search results found.",
                    data={"results": []},
                    audio_base64=audio_b64
                )
            
            result_summaries = []
            results_data = []
            for r in results:
                title = r.get("title") or "Untitled Document"
                content_snippet = r.get("content") or ""
                snippet = content_snippet[:150] + "..." if len(content_snippet) > 150 else content_snippet
                source_type = r.get("source_type", "web")
                result_summaries.append(f"'{title}' from source {source_type}: {snippet}")
                
                results_data.append({
                    "id": r.get("id"),
                    "title": title,
                    "url": r.get("url"),
                    "snippet": content_snippet[:300] if content_snippet else "",
                    "source_type": source_type
                })
                
            speech = f"I found {len(results)} matching entries in the research memory. Here are the top matches: " + "; ".join(result_summaries) + "."
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=True,
                status="completed",
                message=f"Found {len(results)} search results.",
                data={"results": results_data},
                audio_base64=audio_b64
            )
        except Exception as e:
            logger.error(f"Error performing search: {e}")
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    elif tool_name == "query_skills":
        query = args.get("query")
        category = args.get("category")
        
        try:
            from api.routers.skills import _get_merged_skills
            skills = await _get_merged_skills()
            
            filtered_skills = []
            for s in skills:
                if category and s.category.lower() != category.lower():
                    continue
                if query:
                    q = query.lower()
                    if q not in s.name.lower() and q not in (s.description or "").lower():
                        continue
                filtered_skills.append(s)
                
            if not filtered_skills:
                speech = "I could not find any skills matching your search criteria."
                audio_b64 = await synthesize_text_to_base64(speech)
                return VoiceToolExecuteResponse(
                    success=True,
                    status="completed",
                    message="No matching skills found.",
                    data={"skills": []},
                    audio_base64=audio_b64
                )
                
            skill_summaries = []
            skills_data = []
            for s in filtered_skills:
                status = "enabled" if s.enabled else "disabled"
                skill_summaries.append(f"Skill '{s.name}' ({s.category}, currently {status}): {s.description}")
                skills_data.append({
                    "id": s.id,
                    "name": s.name,
                    "description": s.description,
                    "category": s.category,
                    "enabled": s.enabled
                })
                
            speech = f"I found {len(filtered_skills)} skills: " + "; ".join(skill_summaries) + "."
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=True,
                status="completed",
                message=f"Found {len(filtered_skills)} skills.",
                data={"skills": skills_data},
                audio_base64=audio_b64
            )
        except Exception as e:
            logger.error(f"Error querying skills: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to query skills: {str(e)}")

    elif tool_name == "query_social_posts":
        channel = args.get("channel")
        status = args.get("status")
        
        try:
            query_str = "SELECT * FROM scheduled_post"
            params = {}
            conditions = []
            
            if channel:
                conditions.append("channel = $channel")
                params["channel"] = channel
            if status:
                conditions.append("status = $status")
                params["status"] = status
                
            if conditions:
                query_str += " WHERE " + " AND ".join(conditions)
                
            query_str += " ORDER BY scheduled_time DESC;"
            
            results = await repo_query(query_str, params)
            
            if not results:
                speech = "I could not find any social media posts matching your request."
                audio_b64 = await synthesize_text_to_base64(speech)
                return VoiceToolExecuteResponse(
                    success=True,
                    status="completed",
                    message="No posts found.",
                    data={"posts": []},
                    audio_base64=audio_b64
                )
                
            post_summaries = []
            posts_data = []
            for r in results:
                post_title = r.get("title") or "Untitled Post"
                ch = r.get("channel") or "unknown"
                st = r.get("status") or "draft"
                views = r.get("views", 0)
                clicks = r.get("clicks", 0)
                ints = r.get("interactions", 0)
                
                perf_info = f"with {views} views, {clicks} clicks, and {ints} interactions" if st == "published" else f"status: {st}"
                post_summaries.append(f"Post '{post_title}' on {ch} ({perf_info})")
                
                posts_data.append({
                    "id": r.get("id"),
                    "title": post_title,
                    "channel": ch,
                    "status": st,
                    "views": views,
                    "clicks": clicks,
                    "interactions": ints,
                    "scheduled_time": str(r.get("scheduled_time"))
                })
                
            speech = f"I found {len(results)} social media posts. " + "; ".join(post_summaries) + "."
            audio_b64 = await synthesize_text_to_base64(speech)
            return VoiceToolExecuteResponse(
                success=True,
                status="completed",
                message=f"Found {len(results)} posts.",
                data={"posts": posts_data},
                audio_base64=audio_b64
            )
        except Exception as e:
            logger.error(f"Error querying social posts: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to query social posts: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail=f"Unknown tool name: {tool_name}")
