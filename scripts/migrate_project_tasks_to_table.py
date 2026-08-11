"""
One-time migration: copy Project.tasks JSON blobs to the new task table.
Run AFTER migration 52 is applied.
Safe to re-run (idempotent).
"""
import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configure SurrealDB connection details
os.environ.setdefault("SURREAL_URL", "ws://localhost:8000/rpc")
os.environ.setdefault("SURREAL_USER", "root")
os.environ.setdefault("SURREAL_PASSWORD", "root")
os.environ.setdefault("SURREAL_NAMESPACE", "open_notebook")
os.environ.setdefault("SURREAL_DATABASE", "open_notebook")

from open_notebook.database.repository import repo_create, repo_query


async def migrate():
    try:
        # Get all projects with embedded tasks
        projects = await repo_query("SELECT id, tasks, customer_id FROM project WHERE tasks IS NOT NONE")
        if not projects:
            print("No projects with embedded tasks found or SurrealDB is empty.")
            return

        count = 0
        for project in projects:
            tasks_list = project.get("tasks") or []
            project_id = str(project["id"])
            customer_id = str(project.get("customer_id")) if project.get("customer_id") else None

            # Skip if empty list
            if not tasks_list:
                continue

            print(f"Migrating {len(tasks_list)} tasks for project {project_id}...")

            for task_dict in tasks_list:
                title = task_dict.get("name") or task_dict.get("title") or "Untitled Task"
                
                # Check if this task was already migrated to prevent duplicates
                existing = await repo_query(
                    "SELECT id FROM task WHERE project_id = $project_id AND title = $title",
                    {"project_id": project_id, "title": title}
                )
                if existing:
                    print(f"  Task '{title}' already exists in task table, skipping.")
                    continue

                await repo_create("task", {
                    "title": title,
                    "description": task_dict.get("description") or "",
                    "status": task_dict.get("status") or "todo",
                    "priority": task_dict.get("priority") or "medium",
                    "due_date": task_dict.get("due_date"),
                    "project_id": project_id,
                    "customer_id": customer_id,
                    "tags": task_dict.get("tags") or [],
                })
                count += 1

        print(f"Successfully migrated {count} tasks from {len(projects)} projects.")
    except Exception as e:
        print(f"Error during migration: {e}", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(migrate())
