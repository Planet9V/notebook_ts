import os
import re
import json
import asyncio
from typing import Dict, Any, List, Optional
from loguru import logger

from open_notebook.database.repository import repo_query, ensure_record_id, repo_relate
from open_notebook.domain.notebook import Notebook, Note, Source
from open_notebook.domain.task import Task
from api.routers.search import stream_research_response

# Regex to parse markdown checklist items
# Matches: - [ ] Task Title (ID: task:123) or - [x] Task Title
CHECKLIST_REGEX = re.compile(
    r'^\s*-\s*\[([ xX])\]\s*(.*?)(?:\(ID:\s*([a-zA-Z0-9_:]+)\))?\s*$'
)

async def execute_deep_research(notebook_id: str, query: str) -> str:
    """
    Execute deep research asynchronously.
    Saves the final report as a new Source in the notebook, and returns it.
    """
    try:
        from open_notebook.ai.key_provider import get_api_key
        
        # 1. Determine which search engine to use
        valyu_key = await get_api_key("valyu") or os.environ.get("VALYU_API_KEY")
        perplexity_key = await get_api_key("perplexity") or os.environ.get("PERPLEXITY_API_KEY")
        engine = "hybrid" if (valyu_key or perplexity_key) else "local"
        
        logger.info(f"Running slash command /deep-research with engine={engine} for notebook {notebook_id}")
        
        # 2. Execute deep research stream and compile the response
        content_chunks = []
        async for chunk in stream_research_response(query=query, engine=engine):
            if chunk.startswith("data: "):
                try:
                    obj = json.loads(chunk[6:].strip())
                    if obj.get("type") == "answer":
                        content_chunks.append(obj.get("content", ""))
                    elif obj.get("type") == "final_answer":
                        # If final answer is sent, it has the complete text
                        content_chunks = [obj.get("content", "")]
                except Exception as parse_err:
                    logger.warning(f"Error parsing SSE chunk in deep research: {parse_err}")
        
        full_text = "".join(content_chunks).strip()
        if not full_text:
            return "### 🔍 Deep Research: Failure\nNo research findings could be generated for this query."
            
        # 3. Save as a Source in the notebook
        source = Source(
            title=f"Deep Research: {query}",
            full_text=full_text,
        )
        await source.save()
        await source.add_to_notebook(notebook_id)
        
        # Trigger vectorization in the background
        try:
            await source.vectorize()
        except Exception as vec_err:
            logger.warning(f"Failed to trigger vectorization for source {source.id}: {vec_err}")
            
        # 4. Return formatted response with visual dashboard tag
        response_content = (
            f"<research_result source_id='{source.id}'>\n"
            f"### 🔍 Deep Research: {query}\n\n"
            f"{full_text}\n\n"
            f"---\n"
            f"**Analysis details:**\n"
            f"- **Engine**: {engine.capitalize()} Search\n"
            f"- **Linked Source**: [Deep Research: {query}](file:///source/{source.id})\n"
            f"</research_result>"
        )
        return response_content
        
    except Exception as e:
        logger.error(f"Error executing slash command /deep-research: {e}")
        return f"### 🔍 Deep Research: Error\nAn error occurred while executing deep research: {str(e)}"

async def execute_planning_with_files(notebook_id: str, arg_string: str) -> str:
    """
    Execute roadmap planning commands.
    Coordinates notebook-level checklist notes (task_plan.md, findings.md, progress.md)
    and bidirectionally syncs them with SurrealDB task entities.
    """
    try:
        args = arg_string.strip().split()
        subcommand = args[0] if args else "help"
        
        # Verify notebook exists
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            return "### 📅 Planning: Error\nNotebook not found."
            
        # Fetch planning files in this notebook
        notes = await notebook.get_notes()
        task_plan_note = next((n for n in notes if n.title == "task_plan.md"), None)
        findings_note = next((n for n in notes if n.title == "findings.md"), None)
        progress_note = next((n for n in notes if n.title == "progress.md"), None)
        
        # ──── INIT SUBCOMMAND ────
        if subcommand == "init":
            created_notes = []
            
            # 1. Create task_plan.md if not exists
            if not task_plan_note:
                # Compile existing tasks into checklist
                db_tasks = await Task.get_all()
                notebook_tasks = [t for t in db_tasks if str(t.notebook_id) == str(notebook_id)]
                
                checklist_lines = []
                checklist_lines.append(f"# Task Plan: {notebook.name}\n")
                checklist_lines.append("## Phase 1: Context & Core Requirements")
                checklist_lines.append("- [ ] Establish core SOW objectives")
                checklist_lines.append("\n## Tasks Roadmap")
                
                for t in notebook_tasks:
                    checked = "x" if t.status == "done" else " "
                    checklist_lines.append(f"- [{checked}] {t.title} (ID: {t.id})")
                    
                task_plan_content = "\n".join(checklist_lines)
                task_plan_note = Note(
                    title="task_plan.md",
                    content=task_plan_content,
                    note_type="human"
                )
                await task_plan_note.save()
                await task_plan_note.add_to_notebook(notebook_id)
                created_notes.append("task_plan.md")
                
            # 2. Create findings.md if not exists
            if not findings_note:
                findings_note = Note(
                    title="findings.md",
                    content=f"# Findings & Research Insights: {notebook.name}\n\nRecord any discoveries, specifications, and architecture decisions here.",
                    note_type="human"
                )
                await findings_note.save()
                await findings_note.add_to_notebook(notebook_id)
                created_notes.append("findings.md")
                
            # 3. Create progress.md if not exists
            if not progress_note:
                progress_note = Note(
                    title="progress.md",
                    content=f"# Progress Log: {notebook.name}\n\nTrack session history and validation checks here.",
                    note_type="human"
                )
                await progress_note.save()
                await progress_note.add_to_notebook(notebook_id)
                created_notes.append("progress.md")
                
            created_msg = f"Created: {', '.join(created_notes)}" if created_notes else "All planning notes already exist."
            
            # Fetch latest stats
            status_text = await _generate_status_text(notebook_id, task_plan_note, findings_note, progress_note)
            
            return (
                f"<planning_status plan_id='{task_plan_note.id}' findings_id='{findings_note.id}' progress_id='{progress_note.id}'>\n"
                f"### 📅 Planning Notes Initialized\n"
                f"{created_msg}\n\n"
                f"{status_text}\n"
                f"</planning_status>"
            )
            
        # ──── STATUS SUBCOMMAND ────
        elif subcommand == "status":
            if not task_plan_note or not findings_note or not progress_note:
                return (
                    "### 📅 Planning Status\n"
                    "Planning notes are not initialized in this notebook yet. "
                    "Run `/planning-with-files init` to create `task_plan.md`, `findings.md`, and `progress.md`."
                )
                
            status_text = await _generate_status_text(notebook_id, task_plan_note, findings_note, progress_note)
            return (
                f"<planning_status plan_id='{task_plan_note.id}' findings_id='{findings_note.id}' progress_id='{progress_note.id}'>\n"
                f"{status_text}\n"
                f"</planning_status>"
            )
            
        # ──── SYNC SUBCOMMAND ────
        elif subcommand == "sync":
            if not task_plan_note:
                return "### 📅 Planning: Error\nRoadmap plan file `task_plan.md` does not exist. Run `/planning-with-files init` first."
                
            # Perform bidirectional sync
            sync_report = await _sync_tasks_with_plan(notebook_id, task_plan_note)
            
            # Fetch updated stats
            status_text = await _generate_status_text(notebook_id, task_plan_note, findings_note, progress_note)
            return (
                f"<planning_status plan_id='{task_plan_note.id}' findings_id='{findings_note.id}' progress_id='{progress_note.id}'>\n"
                f"### 🔄 Bidirectional Roadmap Sync Successful\n"
                f"{sync_report}\n\n"
                f"{status_text}\n"
                f"</planning_status>"
            )
            
        # ──── HELP SUBCOMMAND ────
        else:
            return (
                "### 📅 `/planning-with-files` Command Guide\n\n"
                "Use the following subcommands to manage project roadmap checklists and sync tasks:\n"
                "- `/planning-with-files init` - Create planning files (`task_plan.md`, `findings.md`, `progress.md`) related to this notebook.\n"
                "- `/planning-with-files status` - Show visual dashboard of current roadmap state.\n"
                "- `/planning-with-files sync` - Bidirectionally sync database task entities with markdown plan checkboxes.\n"
            )
            
    except Exception as e:
        logger.error(f"Error executing slash command /planning-with-files: {e}")
        logger.exception(e)
        return f"### 📅 Planning: Error\nAn error occurred while executing command: {str(e)}"

async def _generate_status_text(notebook_id: str, plan_note: Note, findings_note: Note, progress_note: Note) -> str:
    """Generate visual ASCII progress metrics and roadmap stats."""
    db_tasks = await Task.get_all()
    notebook_tasks = [t for t in db_tasks if str(t.notebook_id) == str(notebook_id)]
    
    total = len(notebook_tasks)
    done = sum(1 for t in notebook_tasks if t.status == "done")
    todo = sum(1 for t in notebook_tasks if t.status == "todo")
    in_progress = sum(1 for t in notebook_tasks if t.status == "in_progress")
    
    pct = int((done / total * 100)) if total > 0 else 0
    
    # Simple ASCII progress bar
    filled = int(pct / 10)
    bar = "▓" * filled + "░" * (10 - filled)
    
    lines = []
    lines.append("### 📊 Project Roadmap Dashboard")
    lines.append(f"Roadmap Progress: `[{bar}]` **{pct}%** ({done}/{total} tasks complete)\n")
    lines.append("| Status | Count | Glow Color |")
    lines.append("|---|---|---|")
    lines.append(f"| 🟢 Completed | {done} | Emerald |")
    lines.append(f"| 🟡 In Progress | {in_progress} | Amber |")
    lines.append(f"| ⚪ To Do | {todo} | Slate |")
    lines.append("")
    lines.append("#### Linked Roadmap Notes:")
    lines.append(f"- 🗺️ **Roadmap Plan**: [task_plan.md](file:///note/{plan_note.id})")
    lines.append(f"- 💡 **Key Findings**: [findings.md](file:///note/{findings_note.id})")
    lines.append(f"- 📈 **Progress Logs**: [progress.md](file:///note/{progress_note.id})")
    
    return "\n".join(lines)

async def _sync_tasks_with_plan(notebook_id: str, plan_note: Note) -> str:
    """Synchronize checklists and database task entities bidirectionally."""
    lines = (plan_note.content or "").split("\n")
    updated_lines = []
    
    created_tasks = []
    updated_tasks = []
    
    # 1. Fetch current database tasks
    db_tasks = await Task.get_all()
    tasks_by_id = {str(t.id): t for t in db_tasks if str(t.notebook_id) == str(notebook_id)}
    processed_task_ids = set()
    
    # 2. Iterate through markdown lines and process checklist items
    for line in lines:
        match = CHECKLIST_REGEX.match(line)
        if match:
            checked_char, title, task_id = match.groups()
            title = title.strip()
            is_checked = (checked_char.lower() == 'x')
            
            # If item already has a task ID
            if task_id:
                full_task_id = task_id if task_id.startswith("task:") else f"task:{task_id}"
                processed_task_ids.add(full_task_id)
                
                if full_task_id in tasks_by_id:
                    task = tasks_by_id[full_task_id]
                    expected_status = "done" if is_checked else "todo"
                    
                    # Sync Markdown -> Database status
                    if task.status == "done" and not is_checked:
                        task.status = "todo"
                        await task.save()
                        updated_tasks.append(f"Unchecked task '{task.title}' -> Set status to todo")
                    elif task.status != "done" and is_checked:
                        task.status = "done"
                        await task.save()
                        updated_tasks.append(f"Checked task '{task.title}' -> Set status to done")
                    # Sync Database status -> Markdown checked status (e.g. if done on board)
                    elif task.status == "done" and not is_checked:
                        # (handled above, but checking if status changed on board to 'done' while note was '[ ]')
                        pass
                    
                    # Ensure checked visual state matches DB state
                    vis_checked = "x" if task.status == "done" else " "
                    updated_lines.append(f"- [{vis_checked}] {title} (ID: {task.id})")
                else:
                    # Task ID in checklist but not in DB (deleted task?) - skip or recreate?
                    # Keep line as is
                    updated_lines.append(line)
            else:
                # New checklist item with no ID -> Create new database Task entity!
                new_task = Task(
                    title=title,
                    notebook_id=notebook_id,
                    status="done" if is_checked else "todo"
                )
                await new_task.save()
                await repo_relate("task_relation", ensure_record_id(new_task.id), ensure_record_id(notebook_id))
                processed_task_ids.add(str(new_task.id))
                created_tasks.append(f"Created task '{title}' from checklist")
                
                updated_lines.append(f"- [{'x' if is_checked else ' '}] {title} (ID: {new_task.id})")
        else:
            updated_lines.append(line)
            
    # 3. Add any database tasks that are NOT in the markdown file yet
    unlisted_tasks = []
    for t_id, task in tasks_by_id.items():
        if t_id not in processed_task_ids:
            unlisted_tasks.append(task)
            
    if unlisted_tasks:
        if not updated_lines or not updated_lines[-1].strip():
            pass
        else:
            updated_lines.append("")
            
        # Append unlisted tasks section if not exists
        has_tasks_header = any("Tasks Roadmap" in l for l in updated_lines)
        if not has_tasks_header:
            updated_lines.append("## Tasks Roadmap")
            
        for t in unlisted_tasks:
            checked = "x" if t.status == "done" else " "
            updated_lines.append(f"- [{checked}] {t.title} (ID: {t.id})")
            updated_tasks.append(f"Added task '{t.title}' to roadmap check-list note")
            
    # 4. Save the synchronized markdown back to the Note
    plan_note.content = "\n".join(updated_lines)
    await plan_note.save()
    
    # Build sync report
    report_items = []
    if created_tasks:
        report_items.append("**Created Tasks:**\n" + "\n".join(f"- {i}" for i in created_tasks))
    if updated_tasks:
        report_items.append("**Synchronized Updates:**\n" + "\n".join(f"- {u}" for i, u in enumerate(updated_tasks)))
    if not created_tasks and not updated_tasks:
        report_items.append("No changes detected. Database and markdown checklist are fully in sync.")
        
    return "\n\n".join(report_items)
