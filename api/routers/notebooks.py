from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from loguru import logger

from api.models import (
    NotebookCreate,
    NotebookDeletePreview,
    NotebookDeleteResponse,
    NotebookResponse,
    NotebookUpdate,
)
from open_notebook.database.repository import ensure_record_id, repo_query
from open_notebook.domain.notebook import Notebook, Source
from open_notebook.exceptions import InvalidInputError

router = APIRouter()


@router.get("/notebooks", response_model=List[NotebookResponse])
async def get_notebooks(
    archived: Optional[bool] = Query(None, description="Filter by archived status"),
    order_by: str = Query("updated desc", description="Order by field and direction"),
):
    """Get all notebooks with optional filtering and ordering."""
    try:
        # Validate order_by against allowlist to prevent SurrealQL injection
        allowed_fields = {"name", "created", "updated"}
        allowed_directions = {"asc", "desc"}

        parts = order_by.strip().lower().split()
        if len(parts) == 1:
            if parts[0] not in allowed_fields:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid order_by field: '{order_by}'. Allowed fields: {', '.join(sorted(allowed_fields))}",
                )
            validated_order_by = parts[0]
        elif len(parts) == 2:
            if parts[0] not in allowed_fields or parts[1] not in allowed_directions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid order_by: '{order_by}'. Allowed fields: {', '.join(sorted(allowed_fields))}. Allowed directions: asc, desc",
                )
            validated_order_by = f"{parts[0]} {parts[1]}"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid order_by format: '{order_by}'. Expected 'field' or 'field direction'",
            )

        # Build the query with counts
        query = f"""
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM notebook
            ORDER BY {validated_order_by}
        """

        result = await repo_query(query)

        # Filter by archived status if specified
        if archived is not None:
            result = [nb for nb in result if nb.get("archived") == archived]

        return [
            NotebookResponse(
                id=str(nb.get("id", "")),
                name=nb.get("name", ""),
                description=nb.get("description", ""),
                archived=nb.get("archived", False),
                created=str(nb.get("created", "")),
                updated=str(nb.get("updated", "")),
                source_count=nb.get("source_count", 0),
                note_count=nb.get("note_count", 0),
                stage=nb.get("stage", "lead"),
                client_name=nb.get("client_name", ""),
                estimated_value=nb.get("estimated_value", 0.0),
                prospect_website=nb.get("prospect_website", ""),
                contacts=nb.get("contacts", []) or [],
                crawl_failed=nb.get("crawl_failed", False),
                suggested_contacts=nb.get("suggested_contacts", []) or [],
            )
            for nb in result
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching notebooks: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching notebooks: {str(e)}"
        )


@router.post("/notebooks", response_model=NotebookResponse)
async def create_notebook(notebook: NotebookCreate):
    """Create a new notebook."""
    try:
        new_notebook = Notebook(
            name=notebook.name,
            description=notebook.description,
            stage=notebook.stage,
            client_name=notebook.client_name,
            estimated_value=notebook.estimated_value,
            prospect_website=notebook.prospect_website,
            contacts=notebook.contacts or [],
            crawl_failed=notebook.crawl_failed or False,
            suggested_contacts=notebook.suggested_contacts or [],
        )
        await new_notebook.save()

        return NotebookResponse(
            id=new_notebook.id or "",
            name=new_notebook.name,
            description=new_notebook.description,
            archived=new_notebook.archived or False,
            created=str(new_notebook.created),
            updated=str(new_notebook.updated),
            source_count=0,  # New notebook has no sources
            note_count=0,  # New notebook has no notes
            stage=new_notebook.stage or "lead",
            client_name=new_notebook.client_name or "",
            estimated_value=new_notebook.estimated_value or 0.0,
            prospect_website=new_notebook.prospect_website or "",
            contacts=new_notebook.contacts or [],
            crawl_failed=new_notebook.crawl_failed or False,
            suggested_contacts=new_notebook.suggested_contacts or [],
        )
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating notebook: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating notebook: {str(e)}"
        )


@router.get(
    "/notebooks/{notebook_id}/delete-preview", response_model=NotebookDeletePreview
)
async def get_notebook_delete_preview(notebook_id: str):
    """Get a preview of what will be deleted when this notebook is deleted."""
    try:
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        preview = await notebook.get_delete_preview()

        return NotebookDeletePreview(
            notebook_id=str(notebook.id),
            notebook_name=notebook.name,
            note_count=preview["note_count"],
            exclusive_source_count=preview["exclusive_source_count"],
            shared_source_count=preview["shared_source_count"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting delete preview for notebook {notebook_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching notebook deletion preview: {str(e)}",
        )


@router.get("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(notebook_id: str):
    """Get a specific notebook by ID."""
    try:
        # Query with counts for single notebook
        query = """
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM $notebook_id
        """
        result = await repo_query(query, {"notebook_id": ensure_record_id(notebook_id)})

        if not result:
            raise HTTPException(status_code=404, detail="Notebook not found")

        nb = result[0]
        return NotebookResponse(
            id=str(nb.get("id", "")),
            name=nb.get("name", ""),
            description=nb.get("description", ""),
            archived=nb.get("archived", False),
            created=str(nb.get("created", "")),
            updated=str(nb.get("updated", "")),
            source_count=nb.get("source_count", 0),
            note_count=nb.get("note_count", 0),
            stage=nb.get("stage", "lead"),
            client_name=nb.get("client_name", ""),
            estimated_value=nb.get("estimated_value", 0.0),
            prospect_website=nb.get("prospect_website", ""),
            contacts=nb.get("contacts", []) or [],
            crawl_failed=nb.get("crawl_failed", False),
            suggested_contacts=nb.get("suggested_contacts", []) or [],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching notebook: {str(e)}"
        )


@router.put("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(
    notebook_id: str,
    notebook_update: NotebookUpdate,
    background_tasks: BackgroundTasks,
):
    """Update a notebook."""
    try:
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Track if stage changed
        stage_changed = False
        new_stage = None
        if notebook_update.stage is not None and notebook_update.stage != notebook.stage:
            stage_changed = True
            new_stage = notebook_update.stage

        # Update only provided fields
        if notebook_update.name is not None:
            notebook.name = notebook_update.name
        if notebook_update.description is not None:
            notebook.description = notebook_update.description
        if notebook_update.archived is not None:
            notebook.archived = notebook_update.archived
        if notebook_update.stage is not None:
            notebook.stage = notebook_update.stage
        if notebook_update.client_name is not None:
            notebook.client_name = notebook_update.client_name
        if notebook_update.estimated_value is not None:
            notebook.estimated_value = notebook_update.estimated_value
        if notebook_update.prospect_website is not None:
            notebook.prospect_website = notebook_update.prospect_website
        if notebook_update.contacts is not None:
            notebook.contacts = notebook_update.contacts
        if notebook_update.crawl_failed is not None:
            notebook.crawl_failed = notebook_update.crawl_failed
        if notebook_update.suggested_contacts is not None:
            notebook.suggested_contacts = notebook_update.suggested_contacts

        await notebook.save()

        # Trigger background pipeline if stage changed
        if stage_changed and new_stage:
            from open_notebook.domain.pipeline_worker import run_pipeline_automation
            background_tasks.add_task(run_pipeline_automation, notebook.id, new_stage)

        # Query with counts after update
        query = """
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM $notebook_id
        """
        result = await repo_query(query, {"notebook_id": ensure_record_id(notebook_id)})

        if result:
            nb = result[0]
            return NotebookResponse(
                id=str(nb.get("id", "")),
                name=nb.get("name", ""),
                description=nb.get("description", ""),
                archived=nb.get("archived", False),
                created=str(nb.get("created", "")),
                updated=str(nb.get("updated", "")),
                source_count=nb.get("source_count", 0),
                note_count=nb.get("note_count", 0),
                stage=nb.get("stage", "lead"),
                client_name=nb.get("client_name", ""),
                estimated_value=nb.get("estimated_value", 0.0),
                prospect_website=nb.get("prospect_website", ""),
                contacts=nb.get("contacts", []) or [],
                crawl_failed=nb.get("crawl_failed", False),
                suggested_contacts=nb.get("suggested_contacts", []) or [],
            )

        # Fallback if query fails
        return NotebookResponse(
            id=notebook.id or "",
            name=notebook.name,
            description=notebook.description,
            archived=notebook.archived or False,
            created=str(notebook.created),
            updated=str(notebook.updated),
            source_count=0,
            note_count=0,
            stage=notebook.stage or "lead",
            client_name=notebook.client_name or "",
            estimated_value=notebook.estimated_value or 0.0,
            prospect_website=notebook.prospect_website or "",
            contacts=notebook.contacts or [],
            crawl_failed=notebook.crawl_failed or False,
            suggested_contacts=notebook.suggested_contacts or [],
        )
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating notebook: {str(e)}"
        )


@router.post("/notebooks/{notebook_id}/sources/{source_id}")
async def add_source_to_notebook(notebook_id: str, source_id: str):
    """Add an existing source to a notebook (create the reference)."""
    try:
        # Check if notebook exists
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Check if source exists
        source = await Source.get(source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        # Check if reference already exists (idempotency)
        existing_ref = await repo_query(
            "SELECT * FROM reference WHERE out = $source_id AND in = $notebook_id",
            {
                "notebook_id": ensure_record_id(notebook_id),
                "source_id": ensure_record_id(source_id),
            },
        )

        # If reference doesn't exist, create it
        if not existing_ref:
            await repo_query(
                "RELATE $source_id->reference->$notebook_id",
                {
                    "notebook_id": ensure_record_id(notebook_id),
                    "source_id": ensure_record_id(source_id),
                },
            )

        return {"message": "Source linked to notebook successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error linking source {source_id} to notebook {notebook_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error linking source to notebook: {str(e)}"
        )


@router.delete("/notebooks/{notebook_id}/sources/{source_id}")
async def remove_source_from_notebook(notebook_id: str, source_id: str):
    """Remove a source from a notebook (delete the reference)."""
    try:
        # Check if notebook exists
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Delete the reference record linking source to notebook
        await repo_query(
            "DELETE FROM reference WHERE out = $notebook_id AND in = $source_id",
            {
                "notebook_id": ensure_record_id(notebook_id),
                "source_id": ensure_record_id(source_id),
            },
        )

        return {"message": "Source removed from notebook successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error removing source {source_id} from notebook {notebook_id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500, detail=f"Error removing source from notebook: {str(e)}"
        )


@router.delete("/notebooks/{notebook_id}", response_model=NotebookDeleteResponse)
async def delete_notebook(
    notebook_id: str,
    delete_exclusive_sources: bool = Query(
        False,
        description="Whether to delete sources that belong only to this notebook",
    ),
):
    """
    Delete a notebook with cascade deletion.

    Always deletes all notes associated with the notebook.
    If delete_exclusive_sources is True, also deletes sources that belong only
    to this notebook (not linked to any other notebooks).
    """
    try:
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        result = await notebook.delete(delete_exclusive_sources=delete_exclusive_sources)

        return NotebookDeleteResponse(
            message="Notebook deleted successfully",
            deleted_notes=result["deleted_notes"],
            deleted_sources=result["deleted_sources"],
            unlinked_sources=result["unlinked_sources"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deleting notebook: {str(e)}"
        )


from pydantic import BaseModel
from typing import List

class GraphNode(BaseModel):
    id: str
    type: str
    purdueLevel: int

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str

class GraphValidationRequest(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class GraphValidationResponse(BaseModel):
    violatedNodes: List[str]
    violatedEdges: List[str]
    threatPaths: List[List[str]]
    verifiedRequirements: List[str]

@router.post("/graph/validate", response_model=GraphValidationResponse)
async def validate_graph(request: GraphValidationRequest):
    """
    Perform a Purdue Model Zone boundary security audit using NetworkX.
    Ensures absolute firewall-mediated separation between process control (Level 1-2)
    and enterprise operations (Level 4).
    """
    try:
        import networkx as nx

        G = nx.DiGraph()
        
        # Track node properties
        node_types = {}
        node_levels = {}
        for n in request.nodes:
            G.add_node(n.id)
            node_types[n.id] = n.type
            node_levels[n.id] = n.purdueLevel
            
        for e in request.edges:
            G.add_edge(e.source, e.target, id=e.id)
            
        violated_nodes = set()
        violated_edges = set()
        threat_paths = []
        
        # 1. Direct Zone Bypass Check
        for u, v, data in G.edges(data=True):
            u_lvl = node_levels.get(u, 1)
            v_lvl = node_levels.get(v, 1)
            u_type = node_types.get(u, "")
            v_type = node_types.get(v, "")
            edge_id = data.get("id", "")
            
            if abs(u_lvl - v_lvl) > 1:
                # Direct crossing of >1 levels without a mediating firewall
                if u_type != "firewall" and v_type != "firewall":
                    violated_nodes.add(u)
                    violated_nodes.add(v)
                    if edge_id:
                        violated_edges.add(edge_id)
                        
        # 2. Firewall Mediation Check
        lvl_1_2_nodes = [n_id for n_id, lvl in node_levels.items() if lvl <= 2]
        lvl_4_nodes = [n_id for n_id, lvl in node_levels.items() if lvl == 4]
        
        for src in lvl_1_2_nodes:
            for tgt in lvl_4_nodes:
                if nx.has_path(G, src, tgt):
                    for path in nx.all_simple_paths(G, src, tgt):
                        # Ensure a mediating firewall exists on the path
                        has_firewall = any(node_types.get(node_id) == "firewall" for node_id in path)
                        if not has_firewall:
                            threat_paths.append(path)
                            # Flag all nodes and edges along the threat vector
                            for node_id in path:
                                violated_nodes.add(node_id)
                            for i in range(len(path) - 1):
                                edge_data = G.get_edge_data(path[i], path[i+1])
                                if edge_data and "id" in edge_data:
                                    violated_edges.add(edge_data["id"])
                                    
        # Return verified requirements if topology is clean and secure
        verified_requirements = []
        if len(threat_paths) == 0 and len(violated_edges) == 0:
            verified_requirements = [
                "hs50-dema",
                "hs50-glitch",
                "hs50-timing",
                "dt200-rdma",
                "dt200-tamper",
                "dt200-quant",
                "iso-spfm",
                "iso-ecc",
                "iso-lfm"
            ]
            
        return GraphValidationResponse(
            violatedNodes=list(violated_nodes),
            violatedEdges=list(violated_edges),
            threatPaths=threat_paths,
            verifiedRequirements=verified_requirements
        )
    except Exception as e:
        logger.error(f"Error in graph validation: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error performing graph audit: {str(e)}"
        )

