"""Contacts API router.

CRUD operations for first-class Contact entities.
Follows the same patterns as api/routers/customers.py:
  - repo_query / repo_create / repo_update / repo_delete for SurrealDB ops
  - Pydantic request/response models from api/models.py
  - ensure_record_id for ID normalisation
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    ContactCreate,
    ContactResponse,
    ContactUpdate,
)
from open_notebook.database.repository import (
    ensure_record_id,
    repo_create,
    repo_delete,
    repo_query,
    repo_update,
)

router = APIRouter()


def _build_contact_response(
    rec: dict,
    customer_name: Optional[str] = None,
    location_names: Optional[List[str]] = None,
) -> ContactResponse:
    """Build a ContactResponse from a raw SurrealDB record dict."""
    first = str(rec.get("first_name", ""))
    last = str(rec.get("last_name", ""))
    
    # Extract location IDs and convert to standard strings
    raw_lids = rec.get("location_ids") or []
    if not raw_lids and rec.get("location_id"):
        raw_lids = [rec.get("location_id")]
    location_ids = [str(lid) for lid in raw_lids]
    
    # Legacy fallbacks
    legacy_location_id = location_ids[0] if location_ids else None
    
    names_list = location_names or []
    legacy_location_name = ", ".join(names_list) if names_list else None

    return ContactResponse(
        id=str(rec.get("id", "")),
        first_name=first,
        last_name=last,
        full_name=f"{first} {last}".strip(),
        email=str(rec.get("email", "") or ""),
        phone=str(rec.get("phone", "") or ""),
        mobile=str(rec.get("mobile", "") or ""),
        title=str(rec.get("title", "") or ""),
        department=str(rec.get("department", "") or ""),
        seniority=str(rec.get("seniority", "") or ""),
        linkedin_url=str(rec.get("linkedin_url", "") or ""),
        customer_id=rec.get("customer_id"),
        customer_name=customer_name,
        location_id=legacy_location_id,
        location_name=legacy_location_name,
        location_ids=location_ids,
        location_names=names_list,
        status=str(rec.get("status", "active") or "active"),
        tags=rec.get("tags") or [],
        notes=str(rec.get("notes", "") or ""),
        last_contacted=rec.get("last_contacted"),
        source=str(rec.get("source", "manual") or "manual"),
        import_batch_id=rec.get("import_batch_id"),
        created=str(rec.get("created", "")),
        updated=str(rec.get("updated", "")),
    )


def _clean_id(val: Optional[str]) -> Optional[str]:
    """Normalize a SurrealDB record ID to its bare suffix (same as customers.clean_id)."""
    if not val:
        return None
    return str(val).split(":", 1)[-1]


def _lookup_name(val: any, name_dict: dict) -> Optional[str]:
    """Helper to lookup name in dict with support for string and RecordID types."""
    if not val:
        return None
    val_str = str(val)
    if val_str in name_dict:
        return name_dict[val_str]
    clean = _clean_id(val_str)
    if clean in name_dict:
        return name_dict[clean]
    return None


@router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
):
    """List contacts, optionally filtered by customer_id or status."""
    try:
        if customer_id:
            # Normalise so both "customer:abc" and "abc" work
            clean = _clean_id(customer_id)
            rec_id = ensure_record_id(customer_id if ":" in customer_id else f"customer:{customer_id}")
            contacts = await repo_query(
                "SELECT * FROM contact WHERE customer_id = $cid OR customer_id = $clean OR customer_id = $rec_id OR customer_id = $rec_id_str ORDER BY last_name ASC;",
                {
                    "cid": customer_id,
                    "clean": clean,
                    "rec_id": rec_id,
                    "rec_id_str": str(rec_id),
                },
            )
        elif status:
            contacts = await repo_query(
                "SELECT * FROM contact WHERE status = $status ORDER BY last_name ASC;",
                {"status": status},
            )
        else:
            contacts = await repo_query("SELECT * FROM contact ORDER BY last_name ASC;")

        # Batch-resolve customer names for the response
        customer_names: dict[str, str] = {}
        cust_ids = {c.get("customer_id") for c in contacts if c.get("customer_id")}
        if cust_ids:
            customers = await repo_query("SELECT id, name FROM customer;")
            for c in customers:
                cid = str(c.get("id", ""))
                customer_names[cid] = str(c.get("name", ""))
                customer_names[_clean_id(cid) or ""] = str(c.get("name", ""))

        # Batch-resolve location names for the response
        location_names: dict[str, str] = {}
        loc_ids = set()
        for c in contacts:
            c_lids = c.get("location_ids") or []
            if not c_lids and c.get("location_id"):
                c_lids = [c.get("location_id")]
            for lid in c_lids:
                if lid:
                    loc_ids.add(str(lid))

        if loc_ids:
            locations = await repo_query("SELECT id, facility_name FROM location;")
            for l in locations:
                lid = str(l.get("id", ""))
                location_names[lid] = str(l.get("facility_name", ""))
                location_names[_clean_id(lid) or ""] = str(l.get("facility_name", ""))

        def _get_names(rec: dict) -> List[str]:
            raw_lids = rec.get("location_ids") or []
            if not raw_lids and rec.get("location_id"):
                raw_lids = [rec.get("location_id")]
            names = []
            for lid in raw_lids:
                name = _lookup_name(lid, location_names)
                if name:
                    names.append(name)
            return names

        return [
            _build_contact_response(
                rec,
                _lookup_name(rec.get("customer_id"), customer_names),
                _get_names(rec),
            )
            for rec in contacts
        ]
    except Exception as e:
        logger.error(f"Error fetching contacts: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching contacts: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# CRUD
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/contacts", response_model=ContactResponse)
async def create_contact(contact_data: ContactCreate):
    """Create a new contact."""
    try:
        data = contact_data.model_dump()
        
        # Resolve/normalize customer ID
        cust_id = data.get("customer_id")
        if cust_id:
            cust_id = str(ensure_record_id(cust_id))
            data["customer_id"] = cust_id
        else:
            data["customer_id"] = None

        # Resolve/normalize location IDs
        location_ids = data.get("location_ids") or []
        
        # Clean legacy location_id out of the output save dictionary
        data.pop("location_id", None)
        
        # If there are location_ids, check that customer_id is set
        if location_ids and not cust_id:
            raise HTTPException(status_code=400, detail="Cannot link contact to locations without a parent organization")
        
        if location_ids:
            # Normalize location IDs
            normalized_loc_ids = [str(ensure_record_id(lid if ":" in str(lid) else f"location:{lid}")) for lid in location_ids]
            data["location_ids"] = normalized_loc_ids
            
            # Fetch locations to verify they exist and belong to the customer
            query_lids = [ensure_record_id(lid) for lid in normalized_loc_ids]
            locations_q = await repo_query("SELECT id, customer_id FROM location WHERE id IN $lids;", {"lids": query_lids})
            found_locs_ids = {str(l.get("id")) for l in locations_q}
            
            if len(found_locs_ids) != len(normalized_loc_ids):
                missing = set(normalized_loc_ids) - found_locs_ids
                raise HTTPException(status_code=404, detail=f"Locations not found: {list(missing)}")
                
            clean_cust_id = _clean_id(cust_id)
            for l in locations_q:
                l_cust = l.get("customer_id")
                if l_cust:
                    l_cust_clean = _clean_id(l_cust)
                    if l_cust_clean != clean_cust_id:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Location {l.get('id')} does not belong to customer {cust_id}"
                        )
        else:
            data["location_ids"] = []

        result = await repo_create("contact", data)

        if isinstance(result, list):
            if not result:
                raise HTTPException(status_code=500, detail="Failed to create contact")
            result = result[0]

        # Emit activity if linked to a customer
        if cust_id:
            from api.routers.activity_emitter import emit_activity
            contact_name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or "Unknown"
            await emit_activity(
                customer_id=cust_id,
                activity_type="contact_added",
                description=f"Contact \"{contact_name}\" added",
                metadata={"contact_id": str(result.get("id", "")), "title": data.get("title", "")},
            )

        # Resolve names
        cust_name = None
        if cust_id:
            cust_rec_id = cust_id if ":" in str(cust_id) else f"customer:{cust_id}"
            cust_result = await repo_query("SELECT name FROM $id", {"id": ensure_record_id(cust_rec_id)})
            if cust_result:
                cust_name = str(cust_result[0].get("name", ""))

        loc_names = []
        loc_ids = result.get("location_ids") or []
        if loc_ids:
            norm_ids = [ensure_record_id(lid if ":" in str(lid) else f"location:{lid}") for lid in loc_ids]
            loc_results = await repo_query("SELECT id, facility_name FROM location WHERE id IN $lids;", {"lids": norm_ids})
            loc_map = {str(l.get("id")): str(l.get("facility_name", "")) for l in loc_results}
            for lid in loc_ids:
                lid_str = str(ensure_record_id(lid if ":" in str(lid) else f"location:{lid}"))
                if lid_str in loc_map:
                    loc_names.append(loc_map[lid_str])

        return _build_contact_response(result, cust_name, loc_names)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating contact: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating contact: {e}")


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str):
    """Get a specific contact by ID."""
    try:
        rec_id = contact_id if ":" in contact_id else f"contact:{contact_id}"
        result = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not result:
            raise HTTPException(status_code=404, detail="Contact not found")

        rec = result[0]
        # Resolve customer name if linked
        cust_name = None
        cust_id = rec.get("customer_id")
        if cust_id:
            cust_rec_id = cust_id if ":" in str(cust_id) else f"customer:{cust_id}"
            cust_result = await repo_query("SELECT name FROM $id", {"id": ensure_record_id(cust_rec_id)})
            if cust_result:
                cust_name = str(cust_result[0].get("name", ""))

        loc_names = []
        loc_ids = rec.get("location_ids") or []
        if not loc_ids and rec.get("location_id"):
            loc_ids = [rec.get("location_id")]
        if loc_ids:
            norm_ids = [ensure_record_id(lid if ":" in str(lid) else f"location:{lid}") for lid in loc_ids]
            loc_results = await repo_query("SELECT id, facility_name FROM location WHERE id IN $lids;", {"lids": norm_ids})
            loc_map = {str(l.get("id")): str(l.get("facility_name", "")) for l in loc_results}
            for lid in loc_ids:
                lid_str = str(ensure_record_id(lid if ":" in str(lid) else f"location:{lid}"))
                if lid_str in loc_map:
                    loc_names.append(loc_map[lid_str])

        return _build_contact_response(rec, cust_name, loc_names)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching contact {contact_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching contact: {e}")


@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, contact_update: ContactUpdate):
    """Update an existing contact."""
    try:
        rec_id = contact_id if ":" in contact_id else f"contact:{contact_id}"

        existing = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")

        data = contact_update.model_dump(exclude_unset=True)
        
        # Handle normalization of customer_id
        if "customer_id" in data:
            data["customer_id"] = str(ensure_record_id(data["customer_id"])) if data["customer_id"] else None
            
        # Determine active customer ID
        active_cust_id = data.get("customer_id") if "customer_id" in data else existing[0].get("customer_id")

        # If customer_id is set to None/cleared, automatically clear location_ids
        if "customer_id" in data and not data["customer_id"]:
            data["location_ids"] = []
            location_ids_updated = True
        else:
            location_ids_updated = "location_ids" in data or "location_id" in data

        # Resolve location_ids from inputs
        if location_ids_updated:
            new_lids = data.get("location_ids")
            if new_lids is None:
                # If they passed location_id but not location_ids (legacy update)
                legacy_lid = data.get("location_id")
                new_lids = [legacy_lid] if legacy_lid else []
            
            # If they passed location_id but also passed location_ids, merge
            if "location_id" in data and data["location_id"] and data["location_id"] not in new_lids:
                new_lids.append(data["location_id"])
            
            # Clean legacy location_id out of update data
            data.pop("location_id", None)
            
            if new_lids and not active_cust_id:
                raise HTTPException(status_code=400, detail="Cannot link contact to locations without a parent organization")
                
            if new_lids:
                normalized_loc_ids = [str(ensure_record_id(lid if ":" in str(lid) else f"location:{lid}")) for lid in new_lids]
                data["location_ids"] = normalized_loc_ids
                
                # Verify locations exist and belong to active customer
                query_lids = [ensure_record_id(lid) for lid in normalized_loc_ids]
                locations_q = await repo_query("SELECT id, customer_id FROM location WHERE id IN $lids;", {"lids": query_lids})
                found_locs_ids = {str(l.get("id")) for l in locations_q}
                
                if len(found_locs_ids) != len(normalized_loc_ids):
                    missing = set(normalized_loc_ids) - found_locs_ids
                    raise HTTPException(status_code=404, detail=f"Locations not found: {list(missing)}")
                    
                clean_cust_id = _clean_id(active_cust_id)
                for l in locations_q:
                    l_cust = l.get("customer_id")
                    if l_cust:
                        l_cust_clean = _clean_id(l_cust)
                        if l_cust_clean != clean_cust_id:
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Location {l.get('id')} does not belong to customer {active_cust_id}"
                            )
            else:
                data["location_ids"] = []
        elif "customer_id" in data and data["customer_id"]:
            # Customer ID is changing, but location_ids is NOT explicitly updated.
            # Validate existing locations against the NEW customer ID.
            existing_lids = existing[0].get("location_ids") or []
            if not existing_lids and existing[0].get("location_id"):
                existing_lids = [existing[0].get("location_id")]
                
            if existing_lids:
                normalized_loc_ids = [str(ensure_record_id(lid if ":" in str(lid) else f"location:{lid}")) for lid in existing_lids]
                query_lids = [ensure_record_id(lid) for lid in normalized_loc_ids]
                locations_q = await repo_query("SELECT id, customer_id FROM location WHERE id IN $lids;", {"lids": query_lids})
                
                clean_cust_id = _clean_id(data["customer_id"])
                for l in locations_q:
                    l_cust = l.get("customer_id")
                    if l_cust:
                        l_cust_clean = _clean_id(l_cust)
                        if l_cust_clean != clean_cust_id:
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Existing Location {l.get('id')} does not belong to new customer {data['customer_id']}"
                            )

        # Remove legacy location_id key if still present
        data.pop("location_id", None)

        if not data:
            # Resolve customer/locations names for existing
            cust_name = None
            cust_id = existing[0].get("customer_id")
            if cust_id:
                cust_rec_id = cust_id if ":" in str(cust_id) else f"customer:{cust_id}"
                cust_result = await repo_query("SELECT name FROM $id", {"id": ensure_record_id(cust_rec_id)})
                if cust_result:
                    cust_name = str(cust_result[0].get("name", ""))

            loc_names = []
            loc_ids = existing[0].get("location_ids") or []
            if not loc_ids and existing[0].get("location_id"):
                loc_ids = [existing[0].get("location_id")]
            if loc_ids:
                norm_ids = [ensure_record_id(lid if ":" in str(lid) else f"location:{lid}") for lid in loc_ids]
                loc_results = await repo_query("SELECT id, facility_name FROM location WHERE id IN $lids;", {"lids": norm_ids})
                loc_map = {str(l.get("id")): str(l.get("facility_name", "")) for l in loc_results}
                for lid in loc_ids:
                    lid_str = str(ensure_record_id(lid if ":" in str(lid) else f"location:{lid}"))
                    if lid_str in loc_map:
                        loc_names.append(loc_map[lid_str])

            return _build_contact_response(existing[0], cust_name, loc_names)

        result = await repo_update("contact", rec_id, data)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to update contact")

        # Resolve names for updated
        cust_name = None
        cust_id = result[0].get("customer_id")
        if cust_id:
            cust_rec_id = cust_id if ":" in str(cust_id) else f"customer:{cust_id}"
            cust_result = await repo_query("SELECT name FROM $id", {"id": ensure_record_id(cust_rec_id)})
            if cust_result:
                cust_name = str(cust_result[0].get("name", ""))

        loc_names = []
        loc_ids = result[0].get("location_ids") or []
        if loc_ids:
            norm_ids = [ensure_record_id(lid if ":" in str(lid) else f"location:{lid}") for lid in loc_ids]
            loc_results = await repo_query("SELECT id, facility_name FROM location WHERE id IN $lids;", {"lids": norm_ids})
            loc_map = {str(l.get("id")): str(l.get("facility_name", "")) for l in loc_results}
            for lid in loc_ids:
                lid_str = str(ensure_record_id(lid if ":" in str(lid) else f"location:{lid}"))
                if lid_str in loc_map:
                    loc_names.append(loc_map[lid_str])

        return _build_contact_response(result[0], cust_name, loc_names)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating contact {contact_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating contact: {e}")


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete a contact record."""
    try:
        rec_id = contact_id if ":" in contact_id else f"contact:{contact_id}"

        existing = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")

        await repo_delete(rec_id)
        return {"message": "Contact deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting contact {contact_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting contact: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# Customer sub-resource convenience
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/customers/{customer_id}/contacts", response_model=List[ContactResponse])
async def get_customer_contacts(customer_id: str):
    """List all contacts for a specific customer (convenience route)."""
    return await get_contacts(customer_id=customer_id)
