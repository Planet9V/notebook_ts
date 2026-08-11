"""
Tasks API router.

CRUD operations for first-class Task entities.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from loguru import logger

from api.auth import require_role
from api.models import (
    TaskSpecLinkRequest,
    TaskSpecLinkResponse,
    TaskTableCreate,
    TaskTableResponse,
    TaskTableUpdate,
)
from open_notebook.domain.task import Task
from open_notebook.exceptions import (
    DatabaseOperationError,
    InvalidInputError,
    NotFoundError,
)

router = APIRouter()


def _build_task_response(task: Task) -> TaskTableResponse:
    """Build a TaskTableResponse from a Task domain model."""
    return TaskTableResponse(
        id=str(task.id),
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        project_id=str(task.project_id) if task.project_id else None,
        customer_id=str(task.customer_id) if task.customer_id else None,
        notebook_id=str(task.notebook_id) if task.notebook_id else None,
        assigned_to=str(task.assigned_to) if task.assigned_to else None,
        created_by=str(task.created_by) if task.created_by else None,
        tags=task.tags or [],
        created=str(task.created) if task.created else "",
        updated=str(task.updated) if task.updated else "",
    )


@router.get("/tasks", response_model=List[TaskTableResponse])
async def list_tasks(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    notebook_id: Optional[str] = Query(None, description="Filter by notebook ID"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all tasks with optional filtering."""
    try:
        tasks = await Task.get_all(order_by="updated desc")

        if project_id:
            tasks = [t for t in tasks if t.project_id == project_id or str(t.project_id) == project_id]
        if customer_id:
            tasks = [t for t in tasks if t.customer_id == customer_id or str(t.customer_id) == customer_id]
        if notebook_id:
            tasks = [t for t in tasks if t.notebook_id == notebook_id or str(t.notebook_id) == notebook_id]
        if assigned_to:
            tasks = [t for t in tasks if t.assigned_to == assigned_to or str(t.assigned_to) == assigned_to]
        if status:
            tasks = [t for t in tasks if t.status == status]

        return [_build_task_response(t) for t in tasks]
    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks", response_model=TaskTableResponse, status_code=201)
async def create_task(data: TaskTableCreate, _ = Depends(require_role("editor"))):
    """Create a new first-class task."""
    try:
        task = Task(
            title=data.title,
            description=data.description,
            status=data.status or "todo",
            priority=data.priority,
            due_date=data.due_date,
            project_id=data.project_id,
            customer_id=data.customer_id,
            notebook_id=data.notebook_id,
            assigned_to=data.assigned_to,
            created_by=data.created_by,
            tags=data.tags or [],
        )
        await task.save()

        # Handle task_relation link creation if relation records are present
        from open_notebook.database.repository import ensure_record_id, repo_relate
        for field_val, rel_name in [
            (data.project_id, "project"),
            (data.customer_id, "customer"),
            (data.notebook_id, "notebook"),
        ]:
            if field_val:
                try:
                    # Relate: task -> task_relation -> entity
                    await repo_relate(
                        "task_relation",
                        ensure_record_id(task.id),
                        ensure_record_id(field_val),
                    )
                except Exception as rel_err:
                    logger.warning(f"Could not create task_relation link for {rel_name}: {rel_err}")

        return _build_task_response(task)
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}", response_model=TaskTableResponse)
async def get_task(task_id: str):
    """Get a single task by ID."""
    try:
        task = await Task.get(task_id)
        return _build_task_response(task)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Task not found")
    except Exception as e:
        logger.error(f"Error getting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/tasks/{task_id}", response_model=TaskTableResponse)
async def update_task(task_id: str, data: TaskTableUpdate, _ = Depends(require_role("editor"))):
    """Update a task."""
    try:
        task = await Task.get(task_id)
        old_status = task.status
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if hasattr(task, key):
                setattr(task, key, value)

        await task.save()

        # Log SRE status transition to activity table
        if "status" in update_data and old_status != task.status:
            from open_notebook.database.repository import repo_query
            desc = f"moved Task '{task.title}' from {old_status} to {task.status}"
            cust_id = str(task.customer_id) if task.customer_id else ""
            try:
                await repo_query(
                    "CREATE activity SET customer_id = $cust_id, activity_type = 'task_move', "
                    "description = $desc, actor = 'SRE', created = time::now(), updated = time::now();",
                    {"cust_id": cust_id, "desc": desc}
                )
            except Exception as act_err:
                logger.warning(f"Could not log task transition activity: {act_err}")

        return _build_task_response(task)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Task not found")
    except InvalidInputError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, _ = Depends(require_role("editor"))):
    """Delete a task."""
    try:
        # Also clean up any task_relation links first
        from open_notebook.database.repository import (
            ensure_record_id,
            repo_delete,
            repo_query,
        )
        try:
            await repo_query("DELETE task_relation WHERE in = $task_id", {"task_id": ensure_record_id(task_id)})
        except Exception as rel_err:
            logger.warning(f"Could not delete relation edges for task {task_id}: {rel_err}")

        await repo_delete(task_id)
        return {"message": "Task deleted", "id": task_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Task not found")
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tasks/spec-links", response_model=TaskSpecLinkResponse, status_code=201)
async def create_task_spec_link(request: TaskSpecLinkRequest, _ = Depends(require_role("editor"))):
    """Link a Task to a compliance spec (Note or Source)."""
    try:
        from open_notebook.database.repository import (
            ensure_record_id,
            repo_query,
            repo_relate,
        )
        
        res = await repo_relate(
            ensure_record_id(request.task_id),
            "task_spec_link",
            ensure_record_id(request.spec_id),
        )
        
        link_id = ""
        created_at = ""
        if res and isinstance(res, list) and len(res) > 0:
            link_id = str(res[0].get("id") or "")
            created_at = str(res[0].get("created_at") or "")
        
        if not link_id:
            # Fallback query
            links = await repo_query(
                "SELECT id, created_at FROM task_spec_link WHERE in = $task_id AND out = $spec_id",
                {"task_id": ensure_record_id(request.task_id), "spec_id": ensure_record_id(request.spec_id)}
            )
            if links:
                link_id = str(links[0]["id"])
                created_at = str(links[0].get("created_at") or "")
                
        return TaskSpecLinkResponse(
            id=link_id,
            task_id=request.task_id,
            spec_id=request.spec_id,
            created_at=created_at
        )
    except Exception as e:
        logger.error(f"Error creating task spec link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tasks/spec-links/{link_id}")
async def delete_task_spec_link(link_id: str, _ = Depends(require_role("editor"))):
    """Delete a Task-to-Spec linkage."""
    try:
        from open_notebook.database.repository import repo_delete
        await repo_delete(link_id)
        return {"message": "Link deleted", "id": link_id}
    except Exception as e:
        logger.error(f"Error deleting task spec link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks/{task_id}/spec-links", response_model=List[TaskSpecLinkResponse])
async def list_task_spec_links(task_id: str):
    """List all compliance specifications linked to a task."""
    try:
        from open_notebook.database.repository import ensure_record_id, repo_query
        results = await repo_query(
            "SELECT id, in, out, created_at FROM task_spec_link WHERE in = $task_id",
            {"task_id": ensure_record_id(task_id)}
        )
        return [
            TaskSpecLinkResponse(
                id=str(r["id"]),
                task_id=str(r["in"]),
                spec_id=str(r["out"]),
                created_at=str(r.get("created_at") or "")
            )
            for r in results
        ]
    except Exception as e:
        logger.error(f"Error listing task spec links: {e}")
        raise HTTPException(status_code=500, detail=str(e))

