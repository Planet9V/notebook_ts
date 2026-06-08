from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from api.models import NoteCreate, NoteResponse, NoteUpdate, LocationNotesRollup, CustomerNotesRollup
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
            notes = await notebook.get_notes()
        else:
            # Get all notes
            notes = await Note.get_all(order_by="updated desc")

        return [
            NoteResponse(
                id=note.id or "",
                title=note.title,
                content=note.content,
                note_type=note.note_type,
                created=str(note.created),
                updated=str(note.updated),
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

        return NoteResponse(
            id=new_note.id or "",
            title=new_note.title,
            content=new_note.content,
            note_type=new_note.note_type,
            created=str(new_note.created),
            updated=str(new_note.updated),
            command_id=str(command_id) if command_id else None,
        )
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating note: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating note: {str(e)}")


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str):
    """Get a specific note by ID."""
    try:
        note = await Note.get(note_id)
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            created=str(note.created),
            updated=str(note.updated),
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

        command_id = await note.save()

        return NoteResponse(
            id=note.id or "",
            title=note.title,
            content=note.content,
            note_type=note.note_type,
            created=str(note.created),
            updated=str(note.updated),
            command_id=str(command_id) if command_id else None,
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
