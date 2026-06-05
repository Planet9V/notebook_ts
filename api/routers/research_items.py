"""Research Items API router.

CRUD operations for ResearchItem entities with search execution and cross-linking.
Supports the Research Intelligence Kanban workflow.
"""

from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from loguru import logger
from pydantic import BaseModel

from api.models import (
    LinkRequest,
    ResearchItemCreate,
    ResearchItemResponse,
    ResearchItemUpdate,
)
from open_notebook.domain.research_item import ResearchItem
from open_notebook.exceptions import (
    DatabaseOperationError,
    InvalidInputError,
    NotFoundError,
)

router = APIRouter()


def _build_ri_response(ri: ResearchItem) -> ResearchItemResponse:
    """Build a ResearchItemResponse from a ResearchItem domain model."""
    # Build engines list: prefer explicit engines[], fall back to single engine
    engines_list = ri.engines if ri.engines else ([ri.engine] if ri.engine else ["perplexity"])
    return ResearchItemResponse(
        id=str(ri.id),
        name=ri.name,
        query=ri.query,
        description=ri.description or "",
        customer_id=ri.customer_id,
        project_id=ri.project_id,
        notebook_id=ri.notebook_id,
        transformation_id=ri.transformation_id,
        stage=ri.stage or "queued",
        status=ri.status or "active",
        engine=ri.engine or "perplexity",
        engines=engines_list,
        formatting_instructions=ri.formatting_instructions or "",
        model_id=ri.model_id,
        interval=ri.interval,
        is_recurring=ri.is_recurring or False,
        last_run=str(ri.last_run) if ri.last_run else None,
        next_run=str(ri.next_run) if ri.next_run else None,
        run_count=ri.run_count or 0,
        last_error=ri.last_error,
        results_summary=ri.results_summary or "",
        results_content=ri.results_content or "",
        save_as_source=ri.save_as_source if ri.save_as_source is not None else True,
        tags=ri.tags or [],
        created=str(ri.created) if ri.created else "",
        updated=str(ri.updated) if ri.updated else "",
        is_deep_research=ri.is_deep_research or False,
        deep_research_state=ri.deep_research_state or "",
        deep_research_events=ri.deep_research_events or [],
    )


@router.get("/research-items", response_model=List[ResearchItemResponse])
async def list_research_items(
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    stage: Optional[str] = Query(None, description="Filter by stage"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all research items with optional filtering."""
    try:
        if customer_id:
            items = await ResearchItem.get_by_customer(customer_id)
        elif project_id:
            items = await ResearchItem.get_by_project(project_id)
        elif stage:
            items = await ResearchItem.get_by_stage(stage)
        else:
            items = await ResearchItem.get_all(order_by="updated desc")

        if status:
            items = [i for i in items if i.status == status]

        return [_build_ri_response(i) for i in items]
    except Exception as e:
        logger.error(f"Error listing research items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-items", response_model=ResearchItemResponse, status_code=201)
async def create_research_item(data: ResearchItemCreate):
    """Create a new research item."""
    try:
        ri = ResearchItem(
            name=data.name,
            query=data.query,
            description=data.description or "",
            customer_id=data.customer_id,
            project_id=data.project_id,
            notebook_id=data.notebook_id,
            transformation_id=data.transformation_id,
            stage=data.stage or "queued",
            engine=data.engine or "perplexity",
            engines=data.engines or [],
            formatting_instructions=data.formatting_instructions or "",
            model_id=data.model_id,
            interval=data.interval,
            is_recurring=data.is_recurring or False,
            save_as_source=data.save_as_source if data.save_as_source is not None else True,
            tags=data.tags or [],
            is_deep_research=data.is_deep_research or False,
            deep_research_state=data.deep_research_state or "",
            deep_research_events=data.deep_research_events or [],
        )

        # Sync engine from engines[] if provided
        if ri.engines and not data.engine:
            ri.engine = ri.engines[0]

        # If recurring, compute next_run
        if ri.is_recurring and ri.interval:
            ri.next_run = ri.compute_next_run()

        await ri.save()

        # Auto-link to customer if specified
        if data.customer_id:
            try:
                await ri.link_customer(data.customer_id)
            except Exception as link_err:
                logger.warning(f"Could not auto-link research to customer: {link_err}")

        # Auto-link to project if specified
        if data.project_id:
            try:
                await ri.link_project(data.project_id)
            except Exception as link_err:
                logger.warning(f"Could not auto-link research to project: {link_err}")

        return _build_ri_response(ri)
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research-items/{item_id}", response_model=ResearchItemResponse)
async def get_research_item(item_id: str):
    """Get a single research item by ID."""
    try:
        ri = await ResearchItem.get(item_id)
        return _build_ri_response(ri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error getting research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def approve_research_item(ri: ResearchItem):
    """Approve research item content, create the note, link it to the notebook, and set stage to completed."""
    from open_notebook.domain.notebook import Note

    if not ri.results_content:
        raise InvalidInputError("No research content found to approve")

    # Resolve notebook_id if missing
    notebook_id = ri.notebook_id
    if not notebook_id and ri.customer_id:
        from open_notebook.database.repository import repo_query
        notebooks = await repo_query(
            "SELECT id FROM notebook WHERE customer_id != NONE AND type::string(customer_id) = type::string($cust_id) AND (archived = false OR archived = None)",
            {"cust_id": ri.customer_id}
        )
        if notebooks:
            notebook_id = notebooks[0]["id"]
            ri.notebook_id = notebook_id
        else:
            from open_notebook.domain.notebook import Notebook
            customer_name = "New Customer"
            cust_res = await repo_query(
                "SELECT name FROM customer WHERE id = $cust_id",
                {"cust_id": ri.customer_id}
            )
            if cust_res:
                customer_name = cust_res[0]["name"]
            
            new_notebook = Notebook(
                name=f"{customer_name} Workspace",
                description=f"Workspace for customer {customer_name}.",
                customer_id=ri.customer_id,
                pipeline_type="sales",
                stage="lead"
            )
            await new_notebook.save()
            notebook_id = new_notebook.id
            ri.notebook_id = notebook_id
            logger.info(f"Automatically created notebook {notebook_id} for customer {ri.customer_id}")

    # Create the Note containing the compiled research output
    note_title = f"[Research] {ri.name}"
    note = Note(
        title=note_title,
        content=ri.results_content,
        note_type="ai",
    )
    await note.save()

    # Link Note to notebook if notebook_id exists
    if notebook_id:
        await note.add_to_notebook(notebook_id)
        logger.info(f"Note {note.id} added to notebook {notebook_id}")
    else:
        logger.warning(f"Note {note.id} created but not linked to any notebook (no notebook_id found)")

    # Create activity log event
    if ri.customer_id:
        from api.routers.activity_emitter import emit_activity
        await emit_activity(
            customer_id=ri.customer_id,
            activity_type="note_added",
            description=f"AI Research note '{note_title}' added",
            metadata={"note_id": note.id, "research_item_id": ri.id, "notebook_id": notebook_id},
        )

    # Mark research item as completed
    ri.stage = "completed"
    if ri.is_recurring and ri.interval:
        ri.next_run = ri.compute_next_run()
        ri.stage = "queued"
    await ri.save()
    logger.info(f"Research item {ri.id} approved and completed.")
    return ri


@router.put("/research-items/{item_id}", response_model=ResearchItemResponse)
async def update_research_item(item_id: str, data: ResearchItemUpdate):
    """Update a research item."""
    try:
        ri = await ResearchItem.get(item_id)
        update_data = data.model_dump(exclude_unset=True)

        # Check if stage is transitioning to completed (e.g. from drag & drop)
        is_transitioning_to_completed = False
        if "stage" in update_data and update_data["stage"] == "completed" and ri.stage != "completed":
            is_transitioning_to_completed = True

        for key, value in update_data.items():
            if hasattr(ri, key):
                setattr(ri, key, value)

        # Recompute next_run if scheduling changed
        if ri.is_recurring and ri.interval:
            ri.next_run = ri.compute_next_run()

        if is_transitioning_to_completed:
            # Trigger full note creation & linking
            await approve_research_item(ri)
        else:
            await ri.save()

        return _build_ri_response(ri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/research-items/{item_id}")
async def delete_research_item(item_id: str):
    """Archive a research item (soft delete)."""
    try:
        ri = await ResearchItem.get(item_id)
        ri.status = "cancelled"
        ri.stage = "archived"
        await ri.save()
        return {"message": "Research item archived", "id": item_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error archiving research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Research execution
# ============================================================


async def run_deep_research_workflow(ri: ResearchItem):
    import asyncio
    from datetime import datetime, timezone

    from langchain_core.messages import HumanMessage, SystemMessage

    from open_notebook.ai.provision import provision_langchain_model
    from open_notebook.domain.scheduled_search_worker import _run_search

    async def save_state(stage: str, message: str):
        ri.deep_research_state = stage
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stage": stage,
            "message": message
        }
        if not ri.deep_research_events:
            ri.deep_research_events = []
        ri.deep_research_events.append(event)
        await ri.save()

    # Step 1: Clarifying
    await save_state("clarifying", "Starting clarifying step: restating research query and identifying goals.")
    model = await provision_langchain_model(
        content=ri.query,
        model_id=ri.model_id,
        default_type="chat",
        max_tokens=8192
    )
    system_prompt = "You are a professional research assistant. Clarify the user's research query by restating it clearly, defining the main research goals, identifying target domains/key concepts, and clarifying any ambiguities."
    human_prompt = f"Research Query: {ri.query}\nFormatting Instructions: {ri.formatting_instructions or 'None'}"
    response = await model.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)])
    clarification = response.content
    await save_state("clarifying", f"Clarified query and goals:\n{clarification}")

    # Step 2: Planning
    await save_state("planning", "Starting planning step: breaking query down into a research plan.")
    system_prompt = "You are a research planner. Based on the clarified research query and goals, construct a step-by-step research plan. Include key sub-questions to investigate, specific search terms to use, and what information is critical to gather."
    human_prompt = f"Original Query: {ri.query}\nClarification: {clarification}"
    response = await model.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)])
    research_plan = response.content
    
    # Generate sub-queries from plan
    sub_queries = [ri.query]
    try:
        query_sys_prompt = "You are a search query generator. Generate 2 to 3 distinct search queries to gather comprehensive information for the following research plan. Provide each search query on a new line. Do not include any other text."
        query_hum_prompt = f"Original Query: {ri.query}\nResearch Plan:\n{research_plan}"
        query_response = await model.ainvoke([SystemMessage(content=query_sys_prompt), HumanMessage(content=query_hum_prompt)])
        lines = [line.strip() for line in query_response.content.strip().split("\n") if line.strip()]
        if lines:
            sub_queries = lines[:3]
    except Exception as q_err:
        logger.warning(f"Failed to generate search queries from plan: {q_err}. Using original query.")
        
    await save_state("planning", f"Research plan generated. Search queries to run: {sub_queries}")

    # Step 3: Gathering
    await save_state("gathering", f"Starting gathering step: executing concurrent searches on selected engines.")
    engines = ri.engines if ri.engines else ([ri.engine] if ri.engine else ["perplexity"])
    
    async def safe_run_search(engine: str, query: str):
        try:
            return await _run_search(engine, query)
        except Exception as e:
            logger.warning(f"Error executing search on engine {engine} with query '{query}': {e}")
            return []

    search_tasks = []
    for engine in engines:
        for q in sub_queries:
            search_tasks.append(safe_run_search(engine, q))

    search_results_list = await asyncio.gather(*search_tasks)
    
    all_results = []
    for results in search_results_list:
        if results:
            all_results.extend(results)
            
    seen_urls = set()
    deduplicated_results = []
    for r in all_results:
        url = r.get("url") or ""
        url_clean = url.strip().lower()
        if url_clean:
            if url_clean not in seen_urls:
                seen_urls.add(url_clean)
                deduplicated_results.append(r)
        else:
            deduplicated_results.append(r)

    if not deduplicated_results:
        deduplicated_results.append({
            "title": "Fallback Search Result",
            "url": "local://kb",
            "content": f"No results could be fetched from engines. Researching query: {ri.query}"
        })

    await save_state("gathering", f"Gathered {len(deduplicated_results)} unique results across engines {engines}.")

    # Step 4: Synthesizing
    await save_state("synthesizing", "Starting synthesizing step: comparing and analyzing findings.")
    findings_str = ""
    for i, r in enumerate(deduplicated_results, 1):
        findings_str += f"Source {i}: {r.get('title')}\nURL: {r.get('url')}\nContent: {r.get('content')}\n\n"
        
    system_prompt = (
        "You are an expert researcher synthesizing search results. Analyze the gathered search findings, extract all relevant facts, "
        "data points, statistics, dates, and names. Compare different perspectives, resolve contradictions, and "
        "synthesize them into a highly comprehensive, exhaustively detailed analysis outline. This outline must be very thorough "
        "and multi-layered to support writing a long-form, high-density, fact-packed report."
    )
    human_prompt = f"Original Query: {ri.query}\nSearch Findings:\n{findings_str}"
    response = await model.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)])
    synthesis = response.content
    await save_state("synthesizing", "Synthesis outline completed.")

    # Step 5: Reporting
    await save_state("reporting", "Starting reporting step: generating formatted markdown report.")
    system_prompt = (
        "You are a professional research report writer. Generate an extremely comprehensive, exhaustive, and detailed long-form markdown report "
        "based on the synthesis outline and the original findings. The report MUST be at least double the length of a typical response, "
        "offering a fully expanded, fact-dense analysis of the research query.\n\n"
        "CRITICAL REQUIREMENTS:\n"
        "1. NO hallucinations, speculation, or unsubstantiated claims. Every fact, statistic, and statement must be strictly derived from the original search findings.\n"
        "2. NO filler words, fluff, or generic placeholders. Every sentence must contain high-density factual information.\n"
        "3. Every paragraph must be thoroughly detailed. Avoid brief summaries or short lists. For each point in the outline, write multiple fully developed paragraphs explaining the technical details, names, dates, and metrics.\n"
        "4. Include proper, extensive in-text citations referring to the sources (e.g., [Source 1], [Source 2] or [1], [2]) directly within the text wherever facts are stated.\n"
        "5. Conclude with a complete bibliography/sources section listing the exact URLs and details of the original sources."
    )
    human_prompt = (
        f"Original Query: {ri.query}\n"
        f"Formatting Instructions: {ri.formatting_instructions or 'None'}\n"
        f"Synthesis Outline:\n{synthesis}\n\n"
        f"Original Sources:\n{findings_str}\n\n"
        f"Generate a highly detailed, fact-packed report that is double the typical length (aim for at least 2000-3000 words), fully expanding on all items in the outline without generic fluff."
    )
    response = await model.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)])
    report_markdown = response.content
    
    # Save notebook_id if missing and customer is set
    notebook_id = ri.notebook_id
    if not notebook_id and ri.customer_id:
        from open_notebook.database.repository import repo_query
        notebooks = await repo_query(
            "SELECT id FROM notebook WHERE customer_id != NONE AND type::string(customer_id) = type::string($cust_id) AND (archived = false OR archived = None)",
            {"cust_id": ri.customer_id}
        )
        if notebooks:
            notebook_id = notebooks[0]["id"]
            ri.notebook_id = notebook_id

    # Finish and transition to review_enhance
    snippet = report_markdown[:1000] + "..." if len(report_markdown) > 1000 else report_markdown
    ri.last_run = datetime.now(timezone.utc)
    ri.run_count = (ri.run_count or 0) + 1
    ri.last_error = None
    ri.results_summary = snippet[:2000]
    ri.results_content = report_markdown
    ri.stage = "review_enhance"
    
    final_event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stage": "completed",
        "message": "Deep research workflow completed successfully."
    }
    if not ri.deep_research_events:
        ri.deep_research_events = []
    ri.deep_research_events.append(final_event)
    await ri.save()
    logger.info(f"Deep research successfully completed for {ri.id}")


async def background_run_research(item_id: str):
    """Execute streaming search research in the background and save results as a Note."""
    import asyncio
    import json

    from api.routers.search import stream_research_response
    from open_notebook.domain.notebook import Note

    logger.info(f"Starting background research execution for research item: {item_id}")
    try:
        ri = await ResearchItem.get(item_id)
        if not ri:
            logger.error(f"Research item {item_id} not found in background task")
            return

        if getattr(ri, "is_deep_research", False) is True:
            try:
                # Wrap the deep research workflow in timeout handling (up to 8 minutes / 480 seconds)
                await asyncio.wait_for(run_deep_research_workflow(ri), timeout=480.0)
            except asyncio.TimeoutError:
                logger.error(f"Deep research timed out after 480 seconds for {item_id}")
                from datetime import datetime, timezone
                timeout_event = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "stage": ri.deep_research_state or "unknown",
                    "message": "Deep research timed out after 480 seconds."
                }
                if not ri.deep_research_events:
                    ri.deep_research_events = []
                ri.deep_research_events.append(timeout_event)
                await ri.mark_failure("Deep research timed out after 480 seconds.")
                return
            except Exception as workflow_err:
                logger.error(f"Error in deep research workflow for {item_id}: {workflow_err}")
                await ri.mark_failure(str(workflow_err))
                return
            return

        # Determine the primary engine to use
        engine = ri.engine
        if not engine and ri.engines:
            engine = ri.engines[0]
        if not engine:
            engine = "perplexity"

        accumulated_answer = ""
        sources = []

        try:
            # Consume the streaming generator directly
            generator = stream_research_response(
                query=ri.query,
                engine=engine,
                transformation_id=ri.transformation_id,
                model_id=ri.model_id,
                custom_prompt=ri.formatting_instructions,
            )

            async for chunk in generator:
                if chunk.startswith("data: "):
                    try:
                        event_data = json.loads(chunk[6:].strip())
                        event_type = event_data.get("type")
                        if event_type == "answer":
                            accumulated_answer += event_data.get("content", "")
                        elif event_type == "final_answer":
                            accumulated_answer = event_data.get("content", "")
                        elif event_type == "sources":
                            sources = event_data.get("content", [])
                        elif event_type == "error":
                            raise Exception(event_data.get("message", "Unknown error in search stream"))
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to decode JSON from chunk: {chunk}")
                    except Exception as e:
                        raise e
        except Exception as search_err:
            logger.error(f"Error in stream_research_response for {item_id}: {search_err}")
            await ri.mark_failure(str(search_err))
            return

        if not accumulated_answer.strip():
            raise Exception("Research generated empty content.")

        # Format and append bibliography/sources if present
        if sources:
            bibliography = "\n\n## Sources & Citations\n"
            for i, src in enumerate(sources, 1):
                title = src.get("title") or f"Web Source {i}"
                url = src.get("url") or ""
                if url:
                    bibliography += f"- [{i}] {title}: {url}\n"
                    bibliography += f"[{i}]: {url}\n"
                    bibliography += f"[Source {i}]: {url}\n"
                else:
                    bibliography += f"- [{i}] {title}\n"
            accumulated_answer += bibliography

        # Determine the notebook_id.
        # If notebook_id is missing, look for a notebook associated with the customer.
        notebook_id = ri.notebook_id
        if not notebook_id and ri.customer_id:
            from open_notebook.database.repository import repo_query
            notebooks = await repo_query(
                "SELECT id FROM notebook WHERE customer_id != NONE AND type::string(customer_id) = type::string($cust_id) AND (archived = false OR archived = None)",
                {"cust_id": ri.customer_id}
            )
            if notebooks:
                notebook_id = notebooks[0]["id"]
                # Save notebook_id on the research item
                ri.notebook_id = notebook_id

        # Mark research item as review_enhance
        snippet = accumulated_answer[:1000] + "..." if len(accumulated_answer) > 1000 else accumulated_answer
        from datetime import datetime, timezone
        ri.last_run = datetime.now(timezone.utc)
        ri.run_count = (ri.run_count or 0) + 1
        ri.last_error = None
        ri.results_summary = snippet[:2000]
        ri.results_content = accumulated_answer
        ri.stage = "review_enhance"
        await ri.save()
        logger.info(f"Background research successfully completed for {item_id}, stage set to review_enhance")

    except Exception as e:
        logger.error(f"Error in background research execution: {e}")
        try:
            ri = await ResearchItem.get(item_id)
            if ri:
                await ri.mark_failure(str(e))
        except Exception:
            pass


@router.post("/research-items/{item_id}/execute")
async def execute_research(item_id: str, background_tasks: BackgroundTasks):
    """Fire a research item NOW — triggers the configured search engine in the background.

    This endpoint marks the item as 'researching', starts a background task,
    and returns immediately. The background task executes the research, saves
    the result as a Note, and marks the item as completed.
    """
    try:
        ri = await ResearchItem.get(item_id)
        ri.stage = "researching"
        await ri.save()

        # Trigger background research task
        background_tasks.add_task(background_run_research, item_id)

        # Build engines list for response
        engines_list = ri.engines if ri.engines else ([ri.engine] if ri.engine else ["perplexity"])

        return {
            "id": str(ri.id),
            "query": ri.query,
            "engine": ri.engine or "perplexity",
            "engines": engines_list,
            "formatting_instructions": ri.formatting_instructions or "",
            "model_id": ri.model_id,
            "transformation_id": ri.transformation_id,
            "notebook_id": ri.notebook_id,
            "save_as_source": ri.save_as_source,
            "status": "executing",
            "message": f"Research item triggered in background with {len(engines_list)} engine(s). Results will be saved as a Note.",
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error executing research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-items/{item_id}/complete")
async def complete_research(item_id: str, summary: str = ""):
    """Mark a research item as completed with optional summary."""
    try:
        ri = await ResearchItem.get(item_id)
        await ri.mark_success(summary)
        return _build_ri_response(ri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error completing research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Due items for scheduled execution
# ============================================================


@router.get("/research-items/due/list")
async def list_due_research_items():
    """Get all recurring research items that are due to run."""
    try:
        items = await ResearchItem.get_due_items()
        return [_build_ri_response(i) for i in items]
    except Exception as e:
        logger.error(f"Error listing due research items: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Cross-linking
# ============================================================


@router.post("/research-items/{item_id}/link/project")
async def link_project_to_research(item_id: str, data: LinkRequest):
    """Link a project to a research item."""
    try:
        ri = await ResearchItem.get(item_id)
        await ri.link_project(data.target_id)
        return {"message": "Project linked", "research_id": item_id, "project_id": data.target_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error linking project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-items/{item_id}/link/customer")
async def link_customer_to_research(item_id: str, data: LinkRequest):
    """Link a customer to a research item."""
    try:
        ri = await ResearchItem.get(item_id)
        await ri.link_customer(data.target_id)
        return {"message": "Customer linked", "research_id": item_id, "customer_id": data.target_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error linking customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research-items/{item_id}/projects")
async def get_research_projects(item_id: str):
    """Get projects linked to a research item."""
    try:
        ri = await ResearchItem.get(item_id)
        projects = await ri.get_linked_projects()
        return [
            {
                "id": str(p.id),
                "name": p.name,
                "stage": p.stage,
                "status": p.status,
                "customer_id": p.customer_id,
            }
            for p in projects
        ]
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except Exception as e:
        logger.error(f"Error getting research projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Review and Enhance Actions
# ============================================================


class EnhanceRequest(BaseModel):
    directions: str
    model_id: Optional[str] = None


@router.post("/research-items/{item_id}/enhance", response_model=ResearchItemResponse)
async def enhance_research_item(item_id: str, data: EnhanceRequest):
    """Rewrite research findings using the LLM based on user directions."""
    try:
        ri = await ResearchItem.get(item_id)
        if not ri:
            raise NotFoundError("Research item not found")
        if not ri.results_content:
            raise InvalidInputError("No research content found to enhance")

        from langchain_core.messages import HumanMessage, SystemMessage

        from open_notebook.ai.provision import provision_langchain_model
        from open_notebook.utils.text_utils import extract_text_content

        directions = data.directions
        original_content = ri.results_content

        # Provision model (default to chat)
        llm_model = await provision_langchain_model(
            content=directions + original_content,
            model_id=data.model_id or ri.model_id,
            default_type="chat",
            max_tokens=8192
        )

        system_prompt = (
            "You are a professional intelligence researcher. Rewrite the research findings based on the user's directions.\n\n"
            "CRITICAL REQUIREMENTS:\n"
            "1. NO hallucinations or unsubstantiated claims. Everything must be based on facts from the original findings.\n"
            "2. NO fillers, fluff, or generic placeholders. Maintain extremely high information density.\n"
            "3. You MUST preserve all original citation tags (e.g., [Source 1], [Source 2], [1], [2] etc.), all source links/URLs, and the complete bibliography/references section from the original content.\n"
            "4. Do not summarize or make the report shorter; preserve the comprehensive detail and length (aim for at least double the standard length) while incorporating the requested improvements.\n"
            "5. Maintain markdown formatting, structures, and all factual assertions."
        )

        user_prompt = (
            f"Original Research Content:\n{original_content}\n\n"
            f"Directions for Improvement:\n{directions}\n\n"
            f"Provide the complete updated research document in markdown format."
        )

        payload = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        logger.info(f"Enhancing research item {item_id} content with LLM model...")
        response = await llm_model.ainvoke(payload)
        updated_content = extract_text_content(response)

        snippet = updated_content[:1000] + "..." if len(updated_content) > 1000 else updated_content
        ri.results_content = updated_content
        ri.results_summary = snippet[:2000]
        await ri.save()

        logger.info(f"Research item {item_id} successfully enhanced.")
        return _build_ri_response(ri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error enhancing research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-items/{item_id}/approve", response_model=ResearchItemResponse)
async def approve_research_endpoint(item_id: str):
    """Approve research item content, create the note, link it, and set stage to completed."""
    try:
        ri = await ResearchItem.get(item_id)
        if not ri:
            raise NotFoundError("Research item not found")

        await approve_research_item(ri)
        return _build_ri_response(ri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Research item not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error approving research item: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research-items/run-due")
async def run_due_research_items(background_tasks: BackgroundTasks):
    """Execute all scheduled recurring research items that are due now in the background."""
    try:
        items = await ResearchItem.get_due_items()
        logger.info(f"Triggering {len(items)} due research items manually.")
        for item in items:
            background_tasks.add_task(background_run_research, item.id)
        return {
            "status": "success",
            "message": f"Triggered execution of {len(items)} due research items.",
            "count": len(items)
        }
    except Exception as e:
        logger.error(f"Error running due research items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

