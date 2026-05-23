from typing import List, Optional
from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    CustomerMetricsResponse,
)
from open_notebook.database.repository import ensure_record_id, repo_query, repo_create, repo_update, repo_delete

router = APIRouter()

STAGE_COMPLIANCE = {
    "lead": 15.0,
    "research": 45.0,
    "proposal": 75.0,
    "won": 100.0
}

def clean_id(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val_str = str(val)
    return val_str.split(":", 1)[-1]


@router.get("/customers", response_model=List[CustomerMetricsResponse])
async def get_customers():
    """Get all customers with calculated notebook metrics and compliance progress."""
    try:
        # Fetch all customers
        customers = await repo_query("SELECT * FROM customer ORDER BY created DESC;")
        
        # Fetch all notebooks
        notebooks = await repo_query("SELECT id, customer_id, estimated_value, stage FROM notebook;")
        
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
                
            response_list.append(
                CustomerMetricsResponse(
                    id=str(cust_id or ""),
                    name=str(cust.get("name", "")),
                    website=str(cust.get("website", "") or ""),
                    description=str(cust.get("description", "") or ""),
                    industry=str(cust.get("industry", "") or ""),
                    primary_sector=str(cust.get("primary_sector", "") or ""),
                    sectors=cust.get("sectors", []) or [],
                    assigned_frameworks=cust.get("assigned_frameworks", []) or [],
                    contacts=cust.get("contacts", []) or [],
                    created=str(cust.get("created", "")),
                    updated=str(cust.get("updated", "")),
                    notebook_count=notebook_count,
                    total_value=total_value,
                    compliance_progress=compliance_progress,
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
            
        return CustomerResponse(
            id=str(result.get("id", "")),
            name=str(result.get("name", "")),
            website=str(result.get("website", "") or ""),
            description=str(result.get("description", "") or ""),
            industry=str(result.get("industry", "") or ""),
            primary_sector=str(result.get("primary_sector", "") or ""),
            sectors=result.get("sectors", []) or [],
            assigned_frameworks=result.get("assigned_frameworks", []) or [],
            contacts=result.get("contacts", []) or [],
            created=str(result.get("created", "")),
            updated=str(result.get("updated", "")),
        )
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
            
        cust = result[0]
        return CustomerResponse(
            id=str(cust.get("id", "")),
            name=str(cust.get("name", "")),
            website=str(cust.get("website", "") or ""),
            description=str(cust.get("description", "") or ""),
            industry=str(cust.get("industry", "") or ""),
            primary_sector=str(cust.get("primary_sector", "") or ""),
            sectors=cust.get("sectors", []) or [],
            assigned_frameworks=cust.get("assigned_frameworks", []) or [],
            contacts=cust.get("contacts", []) or [],
            created=str(cust.get("created", "")),
            updated=str(cust.get("updated", "")),
        )
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
            cust = existing[0]
            return CustomerResponse(
                id=str(cust.get("id", "")),
                name=str(cust.get("name", "")),
                website=str(cust.get("website", "") or ""),
                description=str(cust.get("description", "") or ""),
                industry=str(cust.get("industry", "") or ""),
                primary_sector=str(cust.get("primary_sector", "") or ""),
                sectors=cust.get("sectors", []) or [],
                assigned_frameworks=cust.get("assigned_frameworks", []) or [],
                contacts=cust.get("contacts", []) or [],
                created=str(cust.get("created", "")),
                updated=str(cust.get("updated", "")),
            )
            
        result = await repo_update("customer", rec_id, data)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to update customer")
            
        cust = result[0]
        return CustomerResponse(
            id=str(cust.get("id", "")),
            name=str(cust.get("name", "")),
            website=str(cust.get("website", "") or ""),
            description=str(cust.get("description", "") or ""),
            industry=str(cust.get("industry", "") or ""),
            primary_sector=str(cust.get("primary_sector", "") or ""),
            sectors=cust.get("sectors", []) or [],
            assigned_frameworks=cust.get("assigned_frameworks", []) or [],
            contacts=cust.get("contacts", []) or [],
            created=str(cust.get("created", "")),
            updated=str(cust.get("updated", "")),
        )
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
