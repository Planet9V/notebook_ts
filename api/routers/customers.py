"""Customers API router.

CRUD operations for Customer entities with notebook metrics and compliance progress.
Uses repo_query / repo_create / repo_update / repo_delete for SurrealDB ops
and Pydantic request/response models from api/models.py.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    CustomerCreate,
    CustomerMetricsResponse,
    CustomerResponse,
    CustomerUpdate,
)
from open_notebook.database.repository import (
    ensure_record_id,
    repo_create,
    repo_delete,
    repo_query,
    repo_update,
)

router = APIRouter()

STAGE_COMPLIANCE = {
    "bulk_import": 0.0,
    "data_enrichment": 5.0,
    "lead": 15.0,
    "research": 45.0,
    "technical_discovery": 60.0,
    "proposal": 75.0,
    "won": 100.0,
}


def clean_id(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val_str = str(val)
    return val_str.split(":", 1)[-1]


def _compute_engagement_score(
    notebook_count: int,
    total_value: float,
    contact_count: int,
    compliance_progress: float,
    created: str,
) -> Dict:
    """Calculate a 0-100 engagement score from real activity data.

    Returns a dict with ``score`` (int) and ``breakdown`` (dict)
    showing the per-component values for transparency.
    """

    # 1. Activity breadth (0-25)
    activity_breadth = min(25, notebook_count * 5)

    # 2. Deal value (0-20)
    deal_value_score = min(20, int(total_value / 5000 * 20)) if total_value > 0 else 0

    # 3. Contact depth (0-15)
    contact_depth = min(15, contact_count * 5)

    # 4. Pipeline maturity (0-25)
    pipeline_maturity = int(compliance_progress / 100 * 25)

    # 5. Recency (0-15)
    recency = 1
    try:
        created_clean = created.replace("Z", "+00:00") if created else ""
        created_dt = datetime.fromisoformat(created_clean)
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
        days_since = (datetime.now(timezone.utc) - created_dt).days
        if days_since < 7:
            recency = 15
        elif days_since < 30:
            recency = 12
        elif days_since < 90:
            recency = 8
        elif days_since < 180:
            recency = 4
        else:
            recency = 1
    except Exception:
        recency = 1

    score = min(100, activity_breadth + deal_value_score + contact_depth + pipeline_maturity + recency)

    return {
        "score": score,
        "breakdown": {
            "activity_breadth": activity_breadth,
            "deal_value": deal_value_score,
            "contact_depth": contact_depth,
            "pipeline_maturity": pipeline_maturity,
            "recency": recency,
        },
    }


def _build_customer_response(rec: dict) -> CustomerResponse:
    """Build a CustomerResponse from a raw SurrealDB record dict.

    Maps all fields declared on CustomerResponse so the API always returns
    the full schema, even for records that pre-date the extended CRM fields.
    """

    def _s(key: str, default: str = "") -> str:
        """Safely coerce a field to str, falling back to *default*."""
        return str(rec.get(key, default) or default)

    def _list(key: str) -> list:
        return rec.get(key, []) or []

    return CustomerResponse(
        id=_s("id"),
        name=_s("name"),
        # === Core ===
        website=_s("website"),
        description=_s("description"),
        industry=_s("industry"),
        primary_sector=_s("primary_sector"),
        sectors=_list("sectors"),
        assigned_frameworks=_list("assigned_frameworks"),
        contacts=_list("contacts"),
        # === Address ===
        street_address=_s("street_address"),
        street_address_2=_s("street_address_2"),
        city=_s("city"),
        state=_s("state"),
        postal_code=_s("postal_code"),
        country=_s("country", "US"),
        # === Communication ===
        phone=_s("phone"),
        phone_alt=_s("phone_alt"),
        fax=_s("fax"),
        email=_s("email"),
        # === Sales ===
        salesperson=_s("salesperson"),
        lead_source=_s("lead_source"),
        annual_revenue=rec.get("annual_revenue"),
        employee_count=rec.get("employee_count"),
        # === Classification ===
        customer_type=_s("customer_type", "prospect"),
        tier=_s("tier", "smb"),
        status=_s("status", "active"),
        # === Engagement ===
        last_contact_date=rec.get("last_contact_date"),
        next_followup=rec.get("next_followup"),
        engagement_score=rec.get("engagement_score") or 0,
        # === Social ===
        linkedin_url=_s("linkedin_url"),
        twitter_url=_s("twitter_url"),
        facebook_url=_s("facebook_url"),
        # === Metadata ===
        tags=_list("tags"),
        internal_notes=_s("internal_notes"),
        import_batch_id=rec.get("import_batch_id"),
        import_source=rec.get("import_source"),
        # === Timestamps ===
        created=_s("created"),
        updated=_s("updated"),
    )


@router.get("/customers", response_model=List[CustomerMetricsResponse])
async def get_customers():
    """Get all customers with calculated notebook metrics and compliance progress."""
    try:
        # Fetch all customers
        customers = await repo_query("SELECT * FROM customer ORDER BY created DESC;")

        # Fetch all notebooks
        notebooks = await repo_query("SELECT id, customer_id, estimated_value, stage FROM notebook;")

        # Fetch contact counts per customer in a single query
        contact_rows = await repo_query(
            "SELECT customer_id, count() AS cnt FROM contact GROUP BY customer_id;"
        )
        contact_counts: dict[str, int] = {}
        for row in contact_rows:
            cid = row.get("customer_id")
            if cid:
                contact_counts[str(cid)] = int(row.get("cnt") or 0)
                contact_counts[clean_id(str(cid)) or ""] = int(row.get("cnt") or 0)

        response_list = []
        for cust in customers:
            cust_id = cust.get("id")
            cust_clean = clean_id(cust_id)

            # Find notebooks associated with this customer
            associated_nbs = []
            for nb in notebooks:
                nb_cust_id = nb.get("customer_id")
                if nb_cust_id and clean_id(nb_cust_id) == cust_clean:
                    associated_nbs.append(nb)

            notebook_count = len(associated_nbs)
            total_value = sum(float(nb.get("estimated_value") or 0.0) for nb in associated_nbs)

            if notebook_count > 0:
                total_progress = 0.0
                for nb in associated_nbs:
                    nb_stage = str(nb.get("stage") or "lead").lower().strip()
                    total_progress += STAGE_COMPLIANCE.get(nb_stage, 0.0)
                compliance_progress = total_progress / notebook_count
            else:
                compliance_progress = 0.0

            # Resolve contact count
            cust_id_str = str(cust_id or "")
            contact_count = contact_counts.get(cust_id_str) or contact_counts.get(cust_clean or "", 0)

            # Compute engagement score from real activity data
            engagement = _compute_engagement_score(
                notebook_count=notebook_count,
                total_value=total_value,
                contact_count=contact_count,
                compliance_progress=compliance_progress,
                created=str(cust.get("created") or ""),
            )

            # Build the base response then layer metrics on top
            base = _build_customer_response(cust)
            response_list.append(
                CustomerMetricsResponse(
                    **{**base.model_dump(), "engagement_score": engagement["score"]},
                    notebook_count=notebook_count,
                    total_value=total_value,
                    compliance_progress=compliance_progress,
                    contact_count=contact_count,
                    engagement_breakdown=engagement["breakdown"],
                )
            )

        return response_list
    except Exception as e:
        logger.error(f"Error fetching customers: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching customers: {str(e)}"
        )


@router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer_data: CustomerCreate):
    """Create a new customer record."""
    try:
        data = customer_data.model_dump()
        result = await repo_create("customer", data)

        if isinstance(result, list):
            if not result:
                raise HTTPException(status_code=500, detail="Failed to create customer")
            result = result[0]

        return _build_customer_response(result)
    except Exception as e:
        logger.error(f"Error creating customer: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating customer: {str(e)}"
        )


@router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str):
    """Get a specific customer's details by ID."""
    try:
        rec_id = customer_id
        if ":" not in rec_id:
            rec_id = f"customer:{customer_id}"

        result = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not result:
            raise HTTPException(status_code=404, detail="Customer not found")

        return _build_customer_response(result[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching customer: {str(e)}"
        )


@router.put("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer_update: CustomerUpdate):
    """Update an existing customer's metadata."""
    try:
        rec_id = customer_id
        if ":" not in rec_id:
            rec_id = f"customer:{customer_id}"

        existing = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Customer not found")

        data = customer_update.model_dump(exclude_unset=True)
        if not data:
            return _build_customer_response(existing[0])

        result = await repo_update("customer", rec_id, data)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to update customer")

        # Emit activity
        from api.routers.activity_emitter import emit_activity
        changed_fields = list(data.keys())
        customer_name = result[0].get("name", customer_id)
        await emit_activity(
            customer_id=rec_id,
            activity_type="customer_updated",
            description=f"Customer \"{customer_name}\" updated ({', '.join(changed_fields)})",
            metadata={"changed_fields": changed_fields},
        )

        return _build_customer_response(result[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating customer: {str(e)}"
        )


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    """Delete a customer and update associated notebooks to nullify their customer_id."""
    try:
        rec_id = customer_id
        if ":" not in rec_id:
            rec_id = f"customer:{customer_id}"

        existing = await repo_query("SELECT * FROM $id", {"id": ensure_record_id(rec_id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Customer not found")

        clean_id_val = rec_id.split(":", 1)[-1]

        # Nullify customer_id on associated notebooks
        await repo_query(
            "UPDATE notebook SET customer_id = NONE WHERE customer_id = $rec_id OR customer_id = $clean_id_val;",
            {"rec_id": rec_id, "clean_id_val": clean_id_val}
        )

        # Delete associated contacts
        await repo_query(
            "DELETE contact WHERE customer_id = $rec_id OR customer_id = $clean_id_val;",
            {"rec_id": rec_id, "clean_id_val": clean_id_val}
        )

        # Delete the customer record
        await repo_delete(rec_id)

        return {"message": "Customer deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting customer {customer_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deleting customer: {str(e)}"
        )
