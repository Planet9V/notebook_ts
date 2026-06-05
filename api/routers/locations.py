"""Locations API router.

CRUD operations for Customer Locations/Facilities.
Follows the same patterns as api/routers/customers.py.
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    LocationCreate,
    LocationResponse,
    LocationUpdate,
)
from open_notebook.database.repository import (
    ensure_record_id,
    repo_create,
    repo_delete,
    repo_query,
    repo_update,
)

router = APIRouter()


def _build_location_response(rec: dict) -> LocationResponse:
    """Build a LocationResponse from a raw SurrealDB record dict."""
    return LocationResponse(
        id=str(rec.get("id", "")),
        customer_id=rec.get("customer_id"),
        organization_name=str(rec.get("organization_name", "") or ""),
        facility_name=str(rec.get("facility_name", "")),
        facility_type=str(rec.get("facility_type", "") or ""),
        sectors=rec.get("sectors") or [],
        address=str(rec.get("address", "") or ""),
        country=str(rec.get("country", "") or ""),
        zip_code=str(rec.get("zip_code", "") or ""),
        latitude=rec.get("latitude"),
        longitude=rec.get("longitude"),
        description=str(rec.get("description", "") or ""),
        created=str(rec.get("created", "")),
        updated=str(rec.get("updated", "")),
    )


def _clean_id(val: Optional[str]) -> Optional[str]:
    """Normalize a SurrealDB record ID to its bare suffix."""
    if not val:
        return None
    return str(val).split(":", 1)[-1]


# ──────────────────────────────────────────────────────────────────────────────
# List / Search
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/locations", response_model=List[LocationResponse])
async def get_locations(customer_id: Optional[str] = None):
    """List locations, optionally filtered by customer_id."""
    try:
        if customer_id:
            clean = _clean_id(customer_id)
            rec_id = ensure_record_id(customer_id if ":" in customer_id else f"customer:{customer_id}")
            locations = await repo_query(
                "SELECT * FROM location WHERE customer_id = $cid OR customer_id = $clean OR customer_id = $rec_id OR customer_id = $rec_id_str ORDER BY facility_name ASC;",
                {
                    "cid": customer_id,
                    "clean": clean,
                    "rec_id": rec_id,
                    "rec_id_str": str(rec_id),
                },
            )
        else:
            locations = await repo_query("SELECT * FROM location ORDER BY facility_name ASC;")

        return [_build_location_response(rec) for rec in locations]
    except Exception as e:
        logger.error(f"Error fetching locations: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching locations: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# CRUD
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/locations", response_model=LocationResponse)
async def create_location(location_data: LocationCreate):
    """Create a new location."""
    try:
        data = location_data.model_dump()
        
        # Ensure customer exists if customer_id provided
        cust_id = data.get("customer_id")
        if cust_id:
            if ":" not in cust_id:
                cust_id = f"customer:{cust_id}"
            cust_check = await repo_query("SELECT id FROM $id", {"id": ensure_record_id(cust_id)})
            if not cust_check:
                raise HTTPException(status_code=404, detail="Customer not found")
            data["customer_id"] = str(ensure_record_id(cust_id))

        # Insert timestamps
        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        data["created"] = now_str
        data["updated"] = now_str

        result = await repo_create("location", data)

        if isinstance(result, list):
            if not result:
                raise HTTPException(status_code=500, detail="Failed to create location")
            result = result[0]

        # Emit activity if linked to a customer
        if cust_id:
            from api.routers.activity_emitter import emit_activity
            fac_name = data.get("facility_name", "Unknown")
            await emit_activity(
                customer_id=cust_id,
                activity_type="location_added",
                description=f"Facility Location \"{fac_name}\" added",
                metadata={"location_id": str(result.get("id", "")), "facility_name": fac_name},
            )

        return _build_location_response(result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating location: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating location: {e}")


@router.get("/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: str):
    """Get a specific location by ID."""
    try:
        rec_id = location_id if ":" in location_id else f"location:{location_id}"
        result = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not result:
            raise HTTPException(status_code=404, detail="Location not found")

        return _build_location_response(result[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching location {location_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching location: {e}")


@router.put("/locations/{location_id}", response_model=LocationResponse)
async def update_location(location_id: str, location_update: LocationUpdate):
    """Update an existing location."""
    try:
        rec_id = location_id if ":" in location_id else f"location:{location_id}"

        existing = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Location not found")

        data = location_update.model_dump(exclude_unset=True)
        if not data:
            return _build_location_response(existing[0])

        if "customer_id" in data:
            data["customer_id"] = str(ensure_record_id(data["customer_id"])) if data["customer_id"] else None

        data["updated"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        result = await repo_update("location", rec_id, data)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to update location")

        # Emit activity
        cust_id = existing[0].get("customer_id")
        if cust_id:
            from api.routers.activity_emitter import emit_activity
            fac_name = data.get("facility_name") or existing[0].get("facility_name", "Unknown")
            await emit_activity(
                customer_id=cust_id,
                activity_type="location_updated",
                description=f"Facility Location \"{fac_name}\" updated",
                metadata={"location_id": rec_id, "facility_name": fac_name},
            )

        return _build_location_response(result[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating location {location_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating location: {e}")


@router.delete("/locations/{location_id}")
async def delete_location(location_id: str):
    """Delete a location and cascade-update/delete links."""
    try:
        rec_id = location_id if ":" in location_id else f"location:{location_id}"

        existing = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Location not found")

        # 1. Update contact location links (remove deleted location from array)
        await repo_query(
            "UPDATE contact SET location_ids = array::difference(location_ids, [$rec_id]) WHERE $rec_id IN location_ids;",
            {"rec_id": rec_id}
        )

        # 2. Delete assessments linked to location
        await repo_query(
            "DELETE assessment WHERE location_id = $rec_id;",
            {"rec_id": rec_id}
        )

        # 3. Delete the location record
        await repo_delete(rec_id)

        # Emit activity
        cust_id = existing[0].get("customer_id")
        if cust_id:
            from api.routers.activity_emitter import emit_activity
            fac_name = existing[0].get("facility_name", "Unknown")
            await emit_activity(
                customer_id=cust_id,
                activity_type="location_deleted",
                description=f"Facility Location \"{fac_name}\" deleted",
                metadata={"location_id": rec_id, "facility_name": fac_name},
            )

        return {"message": "Location deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting location {location_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting location: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# Customer sub-resource convenience
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/customers/{customer_id}/locations", response_model=List[LocationResponse])
async def get_customer_locations(customer_id: str):
    """List all locations for a specific customer."""
    return await get_locations(customer_id=customer_id)
