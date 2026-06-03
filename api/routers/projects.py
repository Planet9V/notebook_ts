"""Projects API router.

CRUD operations for Project entities with task management and cross-linking.
Supports the Project Delivery Kanban workflow.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.models import (
    LinkRequest,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    TaskCreate,
    TaskUpdate,
)
from open_notebook.domain.project import Project
from open_notebook.exceptions import DatabaseOperationError, InvalidInputError, NotFoundError

router = APIRouter()


def _build_project_response(project: Project) -> ProjectResponse:
    """Build a ProjectResponse from a Project domain model."""
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description or "",
        customer_id=project.customer_id,
        notebook_id=project.notebook_id,
        stage=project.stage or "planning",
        status=project.status or "active",
        project_type=project.project_type or "",
        priority=project.priority or "medium",
        start_date=project.start_date,
        end_date=project.end_date,
        budget=project.budget,
        assigned_to=project.assigned_to or "",
        tags=project.tags or [],
        tasks=project.tasks or [],
        progress=project.progress or 0,
        created=str(project.created) if project.created else "",
        updated=str(project.updated) if project.updated else "",
    )


@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    stage: Optional[str] = Query(None, description="Filter by stage"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all projects with optional filtering."""
    try:
        if customer_id:
            projects = await Project.get_by_customer(customer_id)
        elif stage:
            projects = await Project.get_by_stage(stage)
        else:
            projects = await Project.get_all(order_by="updated desc")

        if status:
            projects = [p for p in projects if p.status == status]

        return [_build_project_response(p) for p in projects]
    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate):
    """Create a new project."""
    try:
        project = Project(
            name=data.name,
            description=data.description or "",
            customer_id=data.customer_id,
            notebook_id=data.notebook_id,
            stage=data.stage or "planning",
            status=data.status or "active",
            project_type=data.project_type or "",
            priority=data.priority or "medium",
            start_date=data.start_date,
            end_date=data.end_date,
            budget=data.budget,
            assigned_to=data.assigned_to or "",
            tags=data.tags or [],
        )
        await project.save()

        # Auto-link to customer if specified
        if data.customer_id:
            try:
                from open_notebook.domain.customer import Customer

                customer = await Customer.get(data.customer_id)
                await customer.relate("customer_project", project.id)
            except Exception as link_err:
                logger.warning(f"Could not auto-link project to customer: {link_err}")

        return _build_project_response(project)
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get a single project by ID."""
    try:
        project = await Project.get(project_id)
        return _build_project_response(project)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except Exception as e:
        logger.error(f"Error getting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate):
    """Update a project."""
    try:
        project = await Project.get(project_id)
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if hasattr(project, key):
                setattr(project, key, value)

        await project.save()
        return _build_project_response(project)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Archive a project (soft delete)."""
    try:
        project = await Project.get(project_id)
        project.status = "cancelled"
        await project.save()
        return {"message": "Project archived", "id": project_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Task management (embedded task list)
# ============================================================


@router.post("/projects/{project_id}/tasks", response_model=ProjectResponse)
async def add_task(project_id: str, data: TaskCreate):
    """Add a task to a project."""
    try:
        project = await Project.get(project_id)
        task = data.model_dump()
        await project.add_task(task)
        project.progress = project.compute_progress()
        await project.save()
        return _build_project_response(project)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except Exception as e:
        logger.error(f"Error adding task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/projects/{project_id}/tasks/{task_index}", response_model=ProjectResponse)
async def update_task(project_id: str, task_index: int, data: TaskUpdate):
    """Update a task in a project."""
    try:
        project = await Project.get(project_id)
        updates = data.model_dump(exclude_unset=True)
        await project.update_task(task_index, updates)
        project.progress = project.compute_progress()
        await project.save()
        return _build_project_response(project)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Cross-linking
# ============================================================


@router.post("/projects/{project_id}/link/research")
async def link_research_to_project(project_id: str, data: LinkRequest):
    """Link a research item to a project."""
    try:
        project = await Project.get(project_id)
        await project.link_research(data.target_id)
        return {"message": "Research item linked", "project_id": project_id, "research_id": data.target_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except Exception as e:
        logger.error(f"Error linking research to project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/research")
async def get_project_research(project_id: str):
    """Get research items linked to a project."""
    try:
        project = await Project.get(project_id)
        research_items = await project.get_linked_research()
        return [
            {
                "id": str(r.id),
                "name": r.name,
                "query": r.query,
                "stage": r.stage,
                "engine": r.engine,
            }
            for r in research_items
        ]
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except Exception as e:
        logger.error(f"Error getting project research: {e}")
        raise HTTPException(status_code=500, detail=str(e))
