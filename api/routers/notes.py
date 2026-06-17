from typing import List, Literal, Optional
import re
import uuid
from datetime import datetime
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.models import NoteCreate, NoteResponse, NoteUpdate, LocationNotesRollup, CustomerNotesRollup, TagCreate, TagResponse, NodeLayoutCreate, NodeLayoutResponse
from open_notebook.domain.notebook import Note
from open_notebook.exceptions import InvalidInputError

router = APIRouter()


@router.get("/notes", response_model=List[NoteResponse])
async def get_notes(
    notebook_id: Optional[str] = Query(None, description="Filter by notebook ID"),
):
    """Get all notes with optional notebook filtering."""
    try:
        if notebook_id:
            # Get notes for a specific notebook
            from open_notebook.domain.notebook import Notebook

            notebook = await Notebook.get(notebook_id)
            if not notebook:
                raise HTTPException(status_code=404, detail="Notebook not found")
            notes = await notebook.get_notes(include_content=True)
        else:
            # Get all notes
            notes = await Note.get_all(order_by="updated desc")

        # Batch query all entity_note relations to fetch location/customer for each note
        from open_notebook.database.repository import repo_query
        relations = await repo_query(
            "SELECT in, out, out.facility_name AS facility_name FROM entity_note;"
        )
        
        # Map note ID to its location and customer info
        note_relations = {}
        for r in relations:
            nid = str(r.get("in", ""))
            out_val = str(r.get("out", ""))
            if nid not in note_relations:
                note_relations[nid] = {"location_id": None, "location_name": None, "customer_id": None}
            if out_val.startswith("location:"):
                note_relations[nid]["location_id"] = out_val
                note_relations[nid]["location_name"] = r.get("facility_name")
            elif out_val.startswith("customer:"):
                note_relations[nid]["customer_id"] = out_val

        return [
            NoteResponse(
                id=note.id or "",
                title=note.title,
                content=note.content,
                note_type=note.note_type,
                created=str(note.created),
                updated=str(note.updated),
                content_format=note.content_format if isinstance(getattr(note, "content_format", None), str) else "markdown",
                content_markdown_backup=note.content_markdown_backup if isinstance(getattr(note, "content_markdown_backup", None), str) else None,
                location_id=note_relations.get(note.id, {}).get("location_id") if note.id else None,
                location_name=note_relations.get(note.id, {}).get("location_name") if note.id else None,
                customer_id=note_relations.get(note.id, {}).get("customer_id") if note.id else None,
            )
            for note in notes
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching notes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching notes: {str(e)}")


@router.post("/notes", response_model=NoteResponse)
async def create_note(note_data: NoteCreate):
    """Create a new note."""
    try:
        # Mutual exclusion: cannot attach to both location and customer
        if note_data.location_id and note_data.customer_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot attach a note to both a location and a customer simultaneously",
            )

        # Auto-generate title if not provided and it's an AI note
        title = note_data.title
        if not title and note_data.note_type == "ai" and note_data.content:
            from open_notebook.graphs.prompt import graph as prompt_graph

            prompt = "Based on the Note below, please provide a Title for this content, with max 15 words"
            result = await prompt_graph.ainvoke(
                {  # type: ignore[arg-type]
                    "input_text": note_data.content,
                    "prompt": prompt,
                }
            )
            title = result.get("output", "Untitled Note")

        # Validate note_type
        note_type: Optional[Literal["human", "ai"]] = None
        if note_data.note_type in ("human", "ai"):
            note_type = note_data.note_type  # type: ignore[assignment]
        elif note_data.note_type is not None:
            raise HTTPException(
                status_code=400, detail="note_type must be 'human' or 'ai'"
            )

        new_note = Note(
            title=title,
            content=note_data.content,
            note_type=note_type,
            content_format=note_data.content_format,
            content_markdown_backup=note_data.content_markdown_backup,
        )
        command_id = await new_note.save()

        # Add to notebook if specified
        if note_data.notebook_id:
            from open_notebook.domain.notebook import Notebook

            notebook = await Notebook.get(note_data.notebook_id)
            if not notebook:
                raise HTTPException(status_code=404, detail="Notebook not found")
            await new_note.add_to_notebook(note_data.notebook_id)

        # Add to location if specified
        if note_data.location_id:
            loc_id = note_data.location_id
            if ":" not in loc_id:
                loc_id = f"location:{loc_id}"
            from open_notebook.database.repository import repo_query, ensure_record_id
            loc_check = await repo_query("SELECT id, customer_id FROM $id", {"id": ensure_record_id(loc_id)})
            if not loc_check:
                raise HTTPException(status_code=404, detail="Location not found")
            await new_note.add_to_location(loc_id)

            # Emit activity for location note
            from api.routers.activity_emitter import emit_activity
            loc_data = loc_check[0] if loc_check else {}
            loc_cust_id = loc_data.get("customer_id")
            if loc_cust_id:
                await emit_activity(
                    customer_id=str(loc_cust_id),
                    activity_type="note_added_to_location",
                    description=f'Note "{title or "Untitled"}" added to facility',
                    metadata={"note_id": new_note.id, "location_id": loc_id},
                )

        # Add to customer if specified
        if note_data.customer_id:
            cust_id = note_data.customer_id
            if ":" not in cust_id:
                cust_id = f"customer:{cust_id}"
            from open_notebook.database.repository import repo_query, ensure_record_id
            cust_check = await repo_query("SELECT id FROM $id", {"id": ensure_record_id(cust_id)})
            if not cust_check:
                raise HTTPException(status_code=404, detail="Customer not found")
            await new_note.add_to_customer(cust_id)

            # Emit activity for customer note
            from api.routers.activity_emitter import emit_activity
            await emit_activity(
                customer_id=cust_id,
                activity_type="note_added_to_customer",
                description=f'Note "{title or "Untitled"}" added to organization',
                metadata={"note_id": new_note.id, "customer_id": cust_id},
            )

        if new_note.id:
            await trigger_mentions(new_note.id, new_note.content, new_note.title)

        return NoteResponse(
            id=new_note.id or "",
            title=new_note.title,
            content=new_note.content,
            note_type=new_note.note_type,
            created=str(new_note.created),
            updated=str(new_note.updated),
            command_id=str(command_id) if command_id else None,
            content_format=new_note.content_format if isinstance(getattr(new_note, "content_format", None), str) else "markdown",
            content_markdown_backup=new_note.content_markdown_backup if isinstance(getattr(new_note, "content_markdown_backup", None), str) else None,
        )
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating note: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating note: {str(e)}")


class EntityLinkCreate(BaseModel):
    source_id: str
    target_id: str
    link_type: Optional[str] = "references"


@router.get("/notes/links")
async def get_entity_links(notebook_id: Optional[str] = Query(None)):
    """Retrieve all entity links with optional notebook filtering."""
    from open_notebook.database.repository import repo_query
    try:
        if notebook_id:
            query = """
            SELECT id, in, out, link_type, created FROM entity_link 
            WHERE 
                in = $nb OR out = $nb OR
                in.notebook_id = $nb OR out.notebook_id = $nb OR
                $nb IN in.notebooks OR $nb IN out.notebooks;
            """
            results = await repo_query(query, {"nb": notebook_id})
        else:
            results = await repo_query("SELECT id, in, out, link_type, created FROM entity_link;")
        
        # Query task_spec_link records
        task_spec_results = []
        try:
            if notebook_id:
                task_query = """
                SELECT id, in, out, created_at FROM task_spec_link 
                WHERE 
                    in.notebook_id = $nb OR out.notebook_id = $nb;
                """
                task_spec_results = await repo_query(task_query, {"nb": notebook_id})
            else:
                task_spec_results = await repo_query("SELECT id, in, out, created_at FROM task_spec_link;")
        except Exception as te:
            logger.warning(f"Could not fetch task spec links in get_entity_links: {te}")

        combined = []
        for r in results:
            combined.append({
                "id": str(r["id"]),
                "in": str(r["in"]),
                "out": str(r["out"]),
                "link_type": r.get("link_type", "references"),
                "created": str(r.get("created", "")),
            })
        for r in task_spec_results:
            combined.append({
                "id": str(r["id"]),
                "in": str(r["in"]),
                "out": str(r["out"]),
                "link_type": "task_spec",
                "created": str(r.get("created_at", "")),
            })
        return combined
    except Exception as e:
        logger.error(f"Error fetching entity links: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notes/links")
async def create_entity_link(link_data: EntityLinkCreate):
    """Create a link between two entities using repo_relate."""
    from open_notebook.database.repository import repo_relate
    try:
        results = await repo_relate(
            link_data.source_id,
            "entity_link",
            link_data.target_id,
            {"link_type": link_data.link_type}
        )
        if not results:
            raise HTTPException(status_code=500, detail="Failed to create link")
        r = results[0]
        return {
            "id": str(r["id"]),
            "in": str(r["in"]),
            "out": str(r["out"]),
            "link_type": r.get("link_type", "references"),
            "created": str(r.get("created", "")),
        }
    except Exception as e:
        logger.error(f"Error creating entity link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notes/links/{link_id}")
async def delete_entity_link(link_id: str):
    """Delete an entity link."""
    from open_notebook.database.repository import repo_delete
    try:
        full_id = link_id
        if not link_id.startswith("entity_link:") and not link_id.startswith("task_spec_link:"):
            full_id = f"entity_link:{link_id}"
        success = await repo_delete(full_id)
        if not success:
            raise HTTPException(status_code=404, detail="Link not found or failed to delete")
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting entity link: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SuggestedLinkResponse(BaseModel):
    source_id: str
    target_id: str
    reason: str
    link_type: str = "references"


async def generate_relationship_reason(note_content: str, source_text: str, shared_terms: list[str]) -> str:
    """Generate a single-sentence explanation of how a note and source are related using the local LLM."""
    from open_notebook.ai.provision import provision_langchain_model
    from open_notebook.utils.text_utils import extract_text_content
    from langchain_core.messages import SystemMessage, HumanMessage

    note_snippet = note_content[:800]
    source_snippet = source_text[:800]

    prompt = f"""You are an industrial compliance analyst. Explain in one short, clear sentence how this audit note and engineering source document are related.

Audit Note:
"{note_snippet}"

Source Document:
"{source_snippet}"

Shared Technical Terms:
{', '.join(shared_terms)}

Provide ONLY the one-sentence explanation. Do not include introductory text or markdown formatting."""

    try:
        llm = await provision_langchain_model(
            content=prompt,
            model_id=None,
            default_type="chat"
        )
        response = await llm.ainvoke([
            SystemMessage(content="Write a single concise sentence explaining the connection."),
            HumanMessage(content=prompt)
        ])
        return extract_text_content(response).strip()
    except Exception as e:
        logger.warning(f"Failed to generate LLM relationship reason: {e}")
        return f"Shared terms: {', '.join(shared_terms)}"


@router.get("/notes/suggested-links", response_model=List[SuggestedLinkResponse])
async def get_suggested_links(notebook_id: str):
    """Retrieve suggested links between notes and sources in a notebook based on content overlap and customer/facility hierarchy."""
    from open_notebook.domain.notebook import Notebook
    from open_notebook.database.repository import repo_query
    import asyncio

    try:
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        notes = await notebook.get_notes(include_content=True)
        sources = await notebook.get_sources(include_full_text=True)

        # Retrieve existing links to filter out
        existing_links_raw = await repo_query("SELECT in, out FROM entity_link;")
        linked_pairs = set()
        for link in existing_links_raw:
            in_id = str(link.get("in", ""))
            out_id = str(link.get("out", ""))
            if in_id and out_id:
                linked_pairs.add((in_id, out_id))
                linked_pairs.add((out_id, in_id))

        # Try fetching hierarchy mapping (fallback to empty if database tables aren't present)
        loc_parent = {}
        loc_names = {}
        cust_names = {}
        entity_rel = {}
        
        try:
            from collections import defaultdict
            locations_raw = await repo_query("SELECT id, facility_name, customer_id FROM location;")
            for l in locations_raw:
                lid = str(l["id"])
                loc_names[lid] = l.get("facility_name") or "Facility"
                if l.get("customer_id"):
                    loc_parent[lid] = str(l["customer_id"])

            customers_raw = await repo_query("SELECT id, name FROM customer;")
            for c in customers_raw:
                cust_names[str(c["id"])] = c.get("name") or "Customer"

            entity_notes_raw = await repo_query("SELECT in, out FROM entity_note;")
            entity_rel = defaultdict(set)
            for row in entity_notes_raw:
                in_id = str(row.get("in", ""))
                out_id = str(row.get("out", ""))
                if in_id and out_id:
                    entity_rel[in_id].add(out_id)
        except Exception as ex:
            logger.warning(f"Could not load customer/location hierarchy for suggested links: {ex}")
            # Fallback is active, maps remain empty

        # Heuristic term overlap match
        raw_suggestions = []

        # Standard English stopwords to filter out
        standard_stopwords = {
            "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", "at", "by",
            "from", "for", "with", "in", "on", "to", "of", "about", "this", "that", "these",
            "those", "is", "was", "were", "are", "be", "been", "being", "have", "has", "had",
            "do", "does", "did", "not", "no", "yes", "some", "any", "all", "each", "every",
            "both", "such", "other", "another", "more", "most", "some", "such", "than",
            "too", "very", "can", "will", "just", "only", "here", "there", "what", "which",
            "who", "whom", "whose", "why", "how", "as", "into", "onto", "out", "over", "under",
            "again", "further", "then", "once", "here", "there", "when", "where", "why", "how",
            "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
            "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t",
            "can", "will", "just", "don", "should", "now"
        }

        def extract_words(text: str) -> set[str]:
            if not text:
                return set()
            # Find all words of length >= 4 (only letters) and lowercase
            words = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
            return {w for w in words if w not in standard_stopwords}

        # Entities list to match
        entities = []
        for n in notes:
            if n.id:
                entities.append((n.id, n.content or "", extract_words(n.content or "")))
        for s in sources:
            if s.id:
                text = getattr(s, "full_text", "") or ""
                entities.append((s.id, text, extract_words(text)))

        # Compare pairs
        for i in range(len(entities)):
            for j in range(i + 1, len(entities)):
                id1, content1, words1 = entities[i]
                id2, content2, words2 = entities[j]

                # Check if already linked
                if (id1, id2) in linked_pairs:
                    continue

                # Check shared relations
                rel1 = entity_rel.get(id1, set()) if entity_rel else set()
                rel2 = entity_rel.get(id2, set()) if entity_rel else set()

                shared_locs = {r for r in rel1 if r.startswith("location:")}.intersection(
                    {r for r in rel2 if r.startswith("location:")}
                )
                shared_custs = {r for r in rel1 if r.startswith("customer:")}.intersection(
                    {r for r in rel2 if r.startswith("customer:")}
                )

                hierarchical_match = False
                matched_hierarchy_reason = ""
                for r1 in rel1:
                    if r1.startswith("location:") and r1 in loc_parent:
                        p = loc_parent[r1]
                        if p in rel2:
                            hierarchical_match = True
                            matched_hierarchy_reason = f"Facility '{loc_names.get(r1, 'Facility')}' under Customer '{cust_names.get(p, 'Customer')}'"
                for r2 in rel2:
                    if r2.startswith("location:") and r2 in loc_parent:
                        p = loc_parent[r2]
                        if p in rel1:
                            hierarchical_match = True
                            matched_hierarchy_reason = f"Facility '{loc_names.get(r2, 'Facility')}' under Customer '{cust_names.get(p, 'Customer')}'"

                # Intersection of words
                overlap = words1.intersection(words2)
                should_suggest = len(overlap) >= 2 or shared_locs or shared_custs or hierarchical_match

                if should_suggest:
                    sorted_terms = sorted(list(overlap))
                    raw_suggestions.append({
                        "source_id": id1,
                        "target_id": id2,
                        "content1": content1,
                        "content2": content2,
                        "shared_terms": sorted_terms,
                    })

        # Process top matches concurrently using asyncio.gather to avoid latency
        raw_suggestions = raw_suggestions[:10]
        
        async def process_suggestion(sugg):
            reason_text = await generate_relationship_reason(
                sugg["content1"],
                sugg["content2"],
                sugg["shared_terms"]
            )
            return SuggestedLinkResponse(
                source_id=sugg["source_id"],
                target_id=sugg["target_id"],
                reason=reason_text,
                link_type="references"
            )

        suggestions = await asyncio.gather(*(process_suggestion(s) for s in raw_suggestions))
        return list(suggestions)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating suggested links: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str):
    """Get a specific note by ID."""
    try:
        note = await Note.get(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        from open_notebook.database.repository import repo_query, ensure_record_id
        nid = ensure_record_id(note_id if ":" in note_id else f"note:{note_id}")
        linked_entities = await repo_query(
            "SELECT out, out.facility_name AS facility_name FROM entity_note WHERE in = $note_id;",
            {"note_id": nid}
        )
        location_id = None
        location_name = None
        customer_id = None
        for row in linked_entities:
            out_val = str(row.get("out", ""))
            if out_val.startswith("location:"):
                location_id = out_val
                location_name = row.get("facility_name")
            elif out_val.startswith("customer:"):
                customer_id = out_val

        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            created=str(note.created),
            updated=str(note.updated),
            content_format=note.content_format if isinstance(getattr(note, "content_format", None), str) else "markdown",
            content_markdown_backup=note.content_markdown_backup if isinstance(getattr(note, "content_markdown_backup", None), str) else None,
            location_id=location_id,
            location_name=location_name,
            customer_id=customer_id,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching note: {str(e)}")


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, note_update: NoteUpdate):
    """Update a note."""
    try:
        note = await Note.get(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        # Update only provided fields
        if note_update.title is not None:
            note.title = note_update.title
        if note_update.content is not None:
            note.content = note_update.content
        if note_update.note_type is not None:
            if note_update.note_type in ("human", "ai"):
                note.note_type = note_update.note_type  # type: ignore[assignment]
            else:
                raise HTTPException(
                    status_code=400, detail="note_type must be 'human' or 'ai'"
                )
        if note_update.content_format is not None:
            note.content_format = note_update.content_format
        if note_update.content_markdown_backup is not None:
            note.content_markdown_backup = note_update.content_markdown_backup

        command_id = await note.save()

        # Handle updating linked location/customer
        from open_notebook.database.repository import repo_query, ensure_record_id
        nid = ensure_record_id(note_id if ":" in note_id else f"note:{note_id}")

        if note_update.location_id is not None or note_update.customer_id is not None:
            # Get current linkages to evaluate changes and enforce mutual exclusivity
            linked_entities = await repo_query(
                "SELECT out FROM entity_note WHERE in = $note_id;",
                {"note_id": nid}
            )
            current_loc_id = None
            current_cust_id = None
            for row in linked_entities:
                out_val = str(row.get("out", ""))
                if out_val.startswith("location:"):
                    current_loc_id = out_val
                elif out_val.startswith("customer:"):
                    current_cust_id = out_val

            # Decide new values: if update parameter is passed, use it. Otherwise use current database value.
            new_loc_id = note_update.location_id if note_update.location_id is not None else current_loc_id
            new_cust_id = note_update.customer_id if note_update.customer_id is not None else current_cust_id

            # Empty strings are treated as clearing the relationship
            if new_loc_id == "":
                new_loc_id = None
            if new_cust_id == "":
                new_cust_id = None

            if new_loc_id and new_cust_id:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot attach a note to both a location and a customer simultaneously",
                )

            # Delete old location/customer edges
            await repo_query(
                "DELETE entity_note WHERE in = $note_id AND (out STARTS WITH 'location:' OR out STARTS WITH 'customer:');",
                {"note_id": nid}
            )

            # Re-create linkages if new values exist
            if new_loc_id:
                loc_id_clean = new_loc_id if ":" in new_loc_id else f"location:{new_loc_id}"
                await note.add_to_location(loc_id_clean)
            elif new_cust_id:
                cust_id_clean = new_cust_id if ":" in new_cust_id else f"customer:{new_cust_id}"
                await note.add_to_customer(cust_id_clean)

        # Retrieve the final state of linked entities for response
        linked_entities = await repo_query(
            "SELECT out, out.facility_name AS facility_name FROM entity_note WHERE in = $note_id;",
            {"note_id": nid}
        )
        location_id = None
        location_name = None
        customer_id = None
        for row in linked_entities:
            out_val = str(row.get("out", ""))
            if out_val.startswith("location:"):
                location_id = out_val
                location_name = row.get("facility_name")
            elif out_val.startswith("customer:"):
                customer_id = out_val

        if note.id:
            await trigger_mentions(note.id, note.content, note.title)

        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            created=str(note.created),
            updated=str(note.updated),
            command_id=str(command_id) if command_id else None,
            content_format=note.content_format if isinstance(getattr(note, "content_format", None), str) else "markdown",
            content_markdown_backup=note.content_markdown_backup if isinstance(getattr(note, "content_markdown_backup", None), str) else None,
            location_id=location_id,
            location_name=location_name,
            customer_id=customer_id,
        )
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating note: {str(e)}")


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note."""
    try:
        note = await Note.get(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        # Fetch entity links before deletion for activity logging
        from open_notebook.database.repository import repo_query, ensure_record_id
        linked_entities = await repo_query(
            "SELECT out FROM entity_note WHERE in = $note_id;",
            {"note_id": ensure_record_id(note_id)}
        )

        # Clean up entity_note edges (location/customer links)
        await repo_query(
            "DELETE entity_note WHERE in = $note_id;",
            {"note_id": ensure_record_id(note_id)}
        )

        await note.delete()

        # Emit activity for note deletion
        from api.routers.activity_emitter import emit_activity
        for entity in linked_entities:
            entity_id = str(entity.get("out", ""))
            if entity_id.startswith("customer:"):
                await emit_activity(
                    customer_id=entity_id,
                    activity_type="note_removed",
                    description=f'Note "{note.title or "Untitled"}" removed',
                    metadata={"note_id": note_id},
                )
            elif entity_id.startswith("location:"):
                # Try to find the parent customer
                loc_info = await repo_query("SELECT customer_id FROM $id", {"id": ensure_record_id(entity_id)})
                if loc_info and loc_info[0].get("customer_id"):
                    await emit_activity(
                        customer_id=str(loc_info[0]["customer_id"]),
                        activity_type="note_removed_from_location",
                        description=f'Note "{note.title or "Untitled"}" removed from facility',
                        metadata={"note_id": note_id, "location_id": entity_id},
                    )

        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting note: {str(e)}")


# ──────────────────────────────────────────────────────────────────────────────
# Entity Notes — Location and Customer endpoints
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/locations/{location_id}/notes", response_model=List[NoteResponse])
async def get_location_notes(location_id: str):
    """Get all notes attached to a specific location/facility."""
    try:
        from open_notebook.database.repository import repo_query, ensure_record_id
        loc_id = location_id if ":" in location_id else f"location:{location_id}"
        rec_id = ensure_record_id(loc_id)

        # Check location exists
        loc_check = await repo_query("SELECT id, facility_name FROM $id", {"id": rec_id})
        if not loc_check:
            raise HTTPException(status_code=404, detail="Location not found")

        # Query notes linked via entity_note edge
        results = await repo_query(
            "SELECT in.* AS note FROM entity_note WHERE out = $loc_id;",
            {"loc_id": rec_id}
        )

        notes = []
        for row in results:
            n = row.get("note", {})
            if not n or not n.get("id"):
                continue
            notes.append(NoteResponse(
                id=str(n.get("id", "")),
                title=n.get("title"),
                content=n.get("content"),
                note_type=n.get("note_type"),
                created=str(n.get("created", "")),
                updated=str(n.get("updated", "")),
                location_id=str(rec_id),
                location_name=loc_check[0].get("facility_name", ""),
                content_format=n.get("content_format", "markdown"),
                content_markdown_backup=n.get("content_markdown_backup"),
            ))

        # Sort by updated desc
        notes.sort(key=lambda x: x.updated, reverse=True)
        return notes
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching location notes: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching location notes: {e}")


@router.post("/locations/{location_id}/notes", response_model=NoteResponse)
async def create_location_note(location_id: str, note_data: NoteCreate):
    """Create a note and attach it to a location/facility."""
    note_data.location_id = location_id if ":" in location_id else f"location:{location_id}"
    return await create_note(note_data)


@router.get("/customers/{customer_id}/notes", response_model=List[NoteResponse])
async def get_customer_notes(customer_id: str):
    """Get notes attached directly to a customer (not location notes)."""
    try:
        from open_notebook.database.repository import repo_query, ensure_record_id
        cust_id = customer_id if ":" in customer_id else f"customer:{customer_id}"
        rec_id = ensure_record_id(cust_id)

        # Check customer exists
        cust_check = await repo_query("SELECT id FROM $id", {"id": rec_id})
        if not cust_check:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Query notes linked via entity_note edge
        results = await repo_query(
            "SELECT in.* AS note FROM entity_note WHERE out = $cust_id;",
            {"cust_id": rec_id}
        )

        notes = []
        for row in results:
            n = row.get("note", {})
            if not n or not n.get("id"):
                continue
            notes.append(NoteResponse(
                id=str(n.get("id", "")),
                title=n.get("title"),
                content=n.get("content"),
                note_type=n.get("note_type"),
                created=str(n.get("created", "")),
                updated=str(n.get("updated", "")),
                customer_id=str(rec_id),
                content_format=n.get("content_format", "markdown"),
                content_markdown_backup=n.get("content_markdown_backup"),
            ))

        notes.sort(key=lambda x: x.updated, reverse=True)
        return notes
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer notes: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching customer notes: {e}")


@router.post("/customers/{customer_id}/notes", response_model=NoteResponse)
async def create_customer_note(customer_id: str, note_data: NoteCreate):
    """Create a note and attach it to a customer/organization."""
    note_data.customer_id = customer_id if ":" in customer_id else f"customer:{customer_id}"
    return await create_note(note_data)


@router.delete("/locations/{location_id}/notes/{note_id}")
async def detach_location_note(location_id: str, note_id: str):
    """Detach a note from a location (remove edge only, keep the note)."""
    try:
        from open_notebook.database.repository import repo_query, ensure_record_id
        loc_id = location_id if ":" in location_id else f"location:{location_id}"
        n_id = note_id if ":" in note_id else f"note:{note_id}"
        loc_rec = ensure_record_id(loc_id)
        note_rec = ensure_record_id(n_id)

        # Verify edge exists
        edge_check = await repo_query(
            "SELECT id FROM entity_note WHERE in = $note_id AND out = $loc_id;",
            {"note_id": note_rec, "loc_id": loc_rec}
        )
        if not edge_check:
            raise HTTPException(status_code=404, detail="Note is not attached to this location")

        await repo_query(
            "DELETE entity_note WHERE in = $note_id AND out = $loc_id;",
            {"note_id": note_rec, "loc_id": loc_rec}
        )

        # Emit activity
        from api.routers.activity_emitter import emit_activity
        loc_info = await repo_query("SELECT customer_id FROM $id", {"id": loc_rec})
        if loc_info and loc_info[0].get("customer_id"):
            await emit_activity(
                customer_id=str(loc_info[0]["customer_id"]),
                activity_type="note_detached_from_location",
                description=f"Note detached from facility",
                metadata={"note_id": n_id, "location_id": loc_id},
            )

        return {"message": "Note detached from location"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detaching note from location: {e}")
        raise HTTPException(status_code=500, detail=f"Error detaching note: {e}")


@router.delete("/customers/{customer_id}/notes/{note_id}")
async def detach_customer_note(customer_id: str, note_id: str):
    """Detach a note from a customer (remove edge only, keep the note)."""
    try:
        from open_notebook.database.repository import repo_query, ensure_record_id
        cust_id = customer_id if ":" in customer_id else f"customer:{customer_id}"
        n_id = note_id if ":" in note_id else f"note:{note_id}"
        cust_rec = ensure_record_id(cust_id)
        note_rec = ensure_record_id(n_id)

        # Verify edge exists
        edge_check = await repo_query(
            "SELECT id FROM entity_note WHERE in = $note_id AND out = $cust_id;",
            {"note_id": note_rec, "cust_id": cust_rec}
        )
        if not edge_check:
            raise HTTPException(status_code=404, detail="Note is not attached to this customer")

        await repo_query(
            "DELETE entity_note WHERE in = $note_id AND out = $cust_id;",
            {"note_id": note_rec, "cust_id": cust_rec}
        )

        # Emit activity
        from api.routers.activity_emitter import emit_activity
        await emit_activity(
            customer_id=cust_id,
            activity_type="note_detached_from_customer",
            description=f"Note detached from organization",
            metadata={"note_id": n_id, "customer_id": cust_id},
        )

        return {"message": "Note detached from customer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detaching note from customer: {e}")
        raise HTTPException(status_code=500, detail=f"Error detaching note: {e}")


@router.get("/customers/{customer_id}/notes-rollup", response_model=CustomerNotesRollup)
async def get_customer_notes_rollup(customer_id: str):
    """Get rolled-up notes view: direct customer notes + notes grouped by location.

    Follows the same rollup pattern as the compliance assessment rollup.
    """
    try:
        from open_notebook.database.repository import repo_query, ensure_record_id

        cust_id = customer_id if ":" in customer_id else f"customer:{customer_id}"
        rec_id = ensure_record_id(cust_id)

        # Check customer exists
        cust_check = await repo_query("SELECT id FROM $id", {"id": rec_id})
        if not cust_check:
            raise HTTPException(status_code=404, detail="Customer not found")

        # 1. Get direct customer notes
        direct_results = await repo_query(
            "SELECT in.* AS note FROM entity_note WHERE out = $cust_id;",
            {"cust_id": rec_id}
        )
        direct_notes = []
        for row in direct_results:
            n = row.get("note", {})
            if not n or not n.get("id"):
                continue
            direct_notes.append(NoteResponse(
                id=str(n.get("id", "")),
                title=n.get("title"),
                content=n.get("content"),
                note_type=n.get("note_type"),
                created=str(n.get("created", "")),
                updated=str(n.get("updated", "")),
                customer_id=str(rec_id),
                content_format=n.get("content_format", "markdown"),
                content_markdown_backup=n.get("content_markdown_backup"),
            ))
        direct_notes.sort(key=lambda x: x.updated, reverse=True)

        # 2. Get all locations for this customer
        locations = await repo_query(
            "SELECT id, facility_name, customer_id FROM location WHERE customer_id = $cust_id OR customer_id = $cust_str;",
            {"cust_id": rec_id, "cust_str": str(rec_id)}
        )

        # 3. Batch-fetch all notes for all locations in a single query
        loc_ids = [ensure_record_id(str(loc.get("id"))) for loc in locations if loc.get("id")]
        loc_id_map = {str(lid): loc for lid, loc in zip(loc_ids, [l for l in locations if l.get("id")])}

        all_loc_notes_raw = []
        if loc_ids:
            all_loc_notes_raw = await repo_query(
                "SELECT in.* AS note, out AS loc_id FROM entity_note WHERE out IN $loc_ids;",
                {"loc_ids": loc_ids}
            )

        # Group notes by location
        from collections import defaultdict
        notes_by_loc: dict[str, list[NoteResponse]] = defaultdict(list)
        for row in all_loc_notes_raw:
            n = row.get("note", {})
            if not n or not n.get("id"):
                continue
            loc_key = str(row.get("loc_id", ""))
            parent_loc = loc_id_map.get(loc_key, {})
            notes_by_loc[loc_key].append(NoteResponse(
                id=str(n.get("id", "")),
                title=n.get("title"),
                content=n.get("content"),
                note_type=n.get("note_type"),
                created=str(n.get("created", "")),
                updated=str(n.get("updated", "")),
                location_id=loc_key,
                location_name=parent_loc.get("facility_name", ""),
                content_format=n.get("content_format", "markdown"),
                content_markdown_backup=n.get("content_markdown_backup"),
            ))

        # Build location rollups
        location_rollups = []
        for lid in loc_ids:
            lid_str = str(lid)
            loc_data = loc_id_map.get(lid_str, {})
            loc_notes = sorted(notes_by_loc.get(lid_str, []), key=lambda x: x.updated, reverse=True)
            latest_date = loc_notes[0].updated if loc_notes else None
            location_rollups.append(LocationNotesRollup(
                location_id=lid_str,
                facility_name=loc_data.get("facility_name", ""),
                note_count=len(loc_notes),
                latest_note_date=latest_date,
                notes=loc_notes,
            ))

        # Sort locations by note count descending (most notes first)
        location_rollups.sort(key=lambda x: x.note_count, reverse=True)

        total_count = len(direct_notes) + sum(lr.note_count for lr in location_rollups)

        return CustomerNotesRollup(
            customer_id=str(rec_id),
            direct_notes=direct_notes,
            locations=location_rollups,
            total_note_count=total_count,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer notes rollup: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching customer notes rollup: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# Notifications & Mentions
# ──────────────────────────────────────────────────────────────────────────────


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    body: Optional[str] = None
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None
    is_read: bool
    created: str


async def trigger_mentions(note_id: str, content: Optional[str], note_title: str):
    """Scan content for @username mentions, verify user existence, and create notifications."""
    if not content:
        return
    
    # Extract matches of format @username
    usernames = set(re.findall(r"@([a-zA-Z0-9_-]+)", content))
    if not usernames:
        return
        
    from open_notebook.database.repository import repo_query, ensure_record_id
    
    for username in usernames:
        try:
            # Query user
            user_check = await repo_query("SELECT id FROM user WHERE username = $username LIMIT 1;", {"username": username})
            if user_check:
                user_record = user_check[0]
                user_id = user_record["id"]
                
                # Create a preview of content
                body_preview = content[:200] + "..." if len(content) > 200 else content
                notif_id = f"notification:{str(uuid.uuid4())}"
                
                notif_data = {
                    "user_id": ensure_record_id(str(user_id)),
                    "type": "mention",
                    "title": f"Mentioned in note: {note_title or 'Untitled Note'}",
                    "body": body_preview,
                    "entity_id": note_id,
                    "entity_type": "note",
                    "is_read": False,
                    "created": datetime.now().isoformat()
                }
                
                await repo_query(
                    "CREATE type::thing('notification', $id) CONTENT $data;",
                    {"id": notif_id.split(":")[-1], "data": notif_data}
                )
        except Exception as e:
            logger.error(f"Failed to process mention for @{username} on note {note_id}: {e}")


@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user_id: Optional[str] = Query(None)):
    """Retrieve recent notifications."""
    from open_notebook.database.repository import repo_query
    try:
        if user_id:
            from open_notebook.database.repository import ensure_record_id
            rid = ensure_record_id(user_id if ":" in user_id else f"user:{user_id}")
            results = await repo_query(
                "SELECT id, user_id, type, title, body, entity_id, entity_type, is_read, created FROM notification WHERE user_id = $uid ORDER BY created DESC LIMIT 50;",
                {"uid": rid}
            )
        else:
            results = await repo_query(
                "SELECT id, user_id, type, title, body, entity_id, entity_type, is_read, created FROM notification ORDER BY created DESC LIMIT 50;"
            )
        
        return [
            NotificationResponse(
                id=str(r["id"]),
                user_id=str(r["user_id"]),
                type=r["type"],
                title=r["title"],
                body=r.get("body"),
                entity_id=r.get("entity_id"),
                entity_type=r.get("entity_type"),
                is_read=r.get("is_read", False),
                created=str(r.get("created", ""))
            )
            for r in results
        ]
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read."""
    from open_notebook.database.repository import repo_query, ensure_record_id
    try:
        nid = notification_id if ":" in notification_id else f"notification:{notification_id}"
        rid = ensure_record_id(nid)
        await repo_query("UPDATE $id SET is_read = true;", {"id": rid})
        return {"success": True}
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Tag & Node Layout Endpoints ---

@router.get("/tags", response_model=List[TagResponse])
async def list_tags():
    """List all global tags."""
    from open_notebook.database.repository import repo_query
    try:
        results = await repo_query("SELECT id, name, category_type FROM tag ORDER BY name;")
        return [
            TagResponse(
                id=str(row["id"]),
                name=row["name"],
                category_type=row.get("category_type")
            )
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error listing tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tags", response_model=TagResponse)
async def create_tag(tag_data: TagCreate):
    """Create a new global tag."""
    from open_notebook.database.repository import repo_query
    try:
        # Check if tag already exists
        existing = await repo_query("SELECT id, name, category_type FROM tag WHERE name = $name LIMIT 1;", {"name": tag_data.name})
        if existing:
            return TagResponse(
                id=str(existing[0]["id"]),
                name=existing[0]["name"],
                category_type=existing[0].get("category_type")
            )

        # Create new tag
        results = await repo_query(
            "CREATE tag SET name = $name, category_type = $category_type;",
            {"name": tag_data.name, "category_type": tag_data.category_type}
        )
        if not results:
            raise HTTPException(status_code=500, detail="Failed to create tag")
        return TagResponse(
            id=str(results[0]["id"]),
            name=results[0]["name"],
            category_type=results[0].get("category_type")
        )
    except Exception as e:
        logger.error(f"Error creating tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: str):
    """Delete a global tag and its note associations."""
    from open_notebook.database.repository import repo_query, ensure_record_id
    try:
        tid = ensure_record_id(tag_id if ":" in tag_id else f"tag:{tag_id}")
        # Delete note_tag edges first
        await repo_query("DELETE note_tag WHERE out = $tag_id;", {"tag_id": tid})
        # Delete the tag
        await repo_query("DELETE $tag_id;", {"tag_id": tid})
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting tag: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notes/{note_id}/tags/{tag_id}")
async def link_tag_to_note(note_id: str, tag_id: str):
    """Link a tag to a note."""
    from open_notebook.database.repository import repo_query, ensure_record_id
    try:
        nid = ensure_record_id(note_id if ":" in note_id else f"note:{note_id}")
        tid = ensure_record_id(tag_id if ":" in tag_id else f"tag:{tag_id}")
        
        # Verify both exist
        note_exists = await repo_query("SELECT id FROM $note_id LIMIT 1;", {"note_id": nid})
        if not note_exists:
            raise HTTPException(status_code=404, detail="Note not found")
        tag_exists = await repo_query("SELECT id FROM $tag_id LIMIT 1;", {"tag_id": tid})
        if not tag_exists:
            raise HTTPException(status_code=404, detail="Tag not found")

        # Relate
        await repo_query("RELATE $note_id->note_tag->$tag_id UNIQUE;", {"note_id": nid, "tag_id": tid})
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error linking tag to note: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notes/{note_id}/tags/{tag_id}")
async def unlink_tag_from_note(note_id: str, tag_id: str):
    """Unlink a tag from a note."""
    from open_notebook.database.repository import repo_query, ensure_record_id
    try:
        nid = ensure_record_id(note_id if ":" in note_id else f"note:{note_id}")
        tid = ensure_record_id(tag_id if ":" in tag_id else f"tag:{tag_id}")
        
        await repo_query("DELETE note_tag WHERE in = $note_id AND out = $tag_id;", {"note_id": nid, "tag_id": tid})
        return {"success": True}
    except Exception as e:
        logger.error(f"Error unlinking tag from note: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notes/{note_id}/tags", response_model=List[TagResponse])
async def get_note_tags(note_id: str):
    """Get all tags linked to a note."""
    from open_notebook.database.repository import repo_query, ensure_record_id
    try:
        nid = ensure_record_id(note_id if ":" in note_id else f"note:{note_id}")
        results = await repo_query("SELECT out.id AS id, out.name AS name, out.category_type AS category_type FROM note_tag WHERE in = $note_id;", {"note_id": nid})
        return [
            TagResponse(
                id=str(row["id"]),
                name=row["name"],
                category_type=row.get("category_type")
            )
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching note tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/node-layout/{view_type}", response_model=List[NodeLayoutResponse])
async def get_node_layouts(view_type: str):
    """Get node coordinates for a view."""
    from open_notebook.database.repository import repo_query
    try:
        results = await repo_query(
            "SELECT id, node_id, x, y, view_type FROM node_layout WHERE view_type = $view_type;",
            {"view_type": view_type}
        )
        return [
            NodeLayoutResponse(
                id=str(row["id"]),
                node_id=row["node_id"],
                x=float(row["x"]),
                y=float(row["y"]),
                view_type=row["view_type"]
            )
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching node layouts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/node-layout", response_model=NodeLayoutResponse)
async def save_node_layout(layout_data: NodeLayoutCreate):
    """Save/upsert coordinate layout for a node."""
    from open_notebook.database.repository import repo_query, ensure_record_id
    try:
        node_id_clean = layout_data.node_id.replace(":", "_").replace("-", "_")
        layout_id = f"node_layout:{node_id_clean}_{layout_data.view_type}"
        lid = ensure_record_id(layout_id)

        results = await repo_query(
            "UPSERT $id SET node_id = $node_id, x = $x, y = $y, view_type = $view_type;",
            {
                "id": lid,
                "node_id": layout_data.node_id,
                "x": layout_data.x,
                "y": layout_data.y,
                "view_type": layout_data.view_type
            }
        )
        if not results:
            raise HTTPException(status_code=500, detail="Failed to save node layout")
        return NodeLayoutResponse(
            id=str(results[0]["id"]),
            node_id=results[0]["node_id"],
            x=float(results[0]["x"]),
            y=float(results[0]["y"]),
            view_type=results[0]["view_type"]
        )
    except Exception as e:
        logger.error(f"Error saving node layout: {e}")
        raise HTTPException(status_code=500, detail=str(e))

