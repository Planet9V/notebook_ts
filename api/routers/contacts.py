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


def _build_contact_response(rec: dict, customer_name: Optional[str] = None) -> ContactResponse:
    """Build a ContactResponse from a raw SurrealDB record dict."""
    first = str(rec.get("first_name", ""))
    last = str(rec.get("last_name", ""))
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


# ──────────────────────────────────────────────────────────────────────────────
# List / Search
# ──────────────────────────────────────────────────────────────────────────────


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
            contacts = await repo_query(
                "SELECT * FROM contact WHERE customer_id = $cid OR customer_id = $clean ORDER BY last_name ASC;",
                {"cid": customer_id, "clean": clean},
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

        return [
            _build_contact_response(rec, customer_names.get(rec.get("customer_id", ""), None))
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
        result = await repo_create("contact", data)

        if isinstance(result, list):
            if not result:
                raise HTTPException(status_code=500, detail="Failed to create contact")
            result = result[0]

        # Emit activity if linked to a customer
        cust_id = data.get("customer_id")
        if cust_id:
            from api.routers.activity_emitter import emit_activity
            contact_name = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or "Unknown"
            await emit_activity(
                customer_id=cust_id,
                activity_type="contact_added",
                description=f"Contact \"{contact_name}\" added",
                metadata={"contact_id": str(result.get("id", "")), "title": data.get("title", "")},
            )

        return _build_contact_response(result)
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

        return _build_contact_response(rec, cust_name)
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
        if not data:
            return _build_contact_response(existing[0])

        result = await repo_update("contact", rec_id, data)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to update contact")

        return _build_contact_response(result[0])
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
