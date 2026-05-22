from typing import List
from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import PipelineRuleCreate, PipelineRuleResponse
from open_notebook.domain.pipeline_rule import PipelineRule
from open_notebook.domain.pipeline_worker import get_scanning_status

router = APIRouter()


@router.get("/pipeline/rules", response_model=List[PipelineRuleResponse])
async def get_pipeline_rules():
    """Get all configured pipeline rules."""
    try:
        rules = await PipelineRule.get_all(order_by="created desc")
        return [
            PipelineRuleResponse(
                id=str(rule.id),
                stage=rule.stage,
                action_type=rule.action_type,
                prompt=rule.prompt,
                query_template=rule.query_template or "",
                model_override=rule.model_override,
                is_active=rule.is_active,
                created=str(rule.created),
                updated=str(rule.updated),
            )
            for rule in rules
        ]
    except Exception as e:
        logger.error(f"Error fetching pipeline rules: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching pipeline rules: {str(e)}"
        )


@router.post("/pipeline/rules", response_model=PipelineRuleResponse)
async def create_pipeline_rule(rule_data: PipelineRuleCreate):
    """Create a new pipeline automation rule."""
    try:
        rule = PipelineRule(
            stage=rule_data.stage,
            action_type=rule_data.action_type,
            prompt=rule_data.prompt,
            query_template=rule_data.query_template or "",
            model_override=rule_data.model_override,
            is_active=rule_data.is_active,
        )
        await rule.save()

        return PipelineRuleResponse(
            id=str(rule.id),
            stage=rule.stage,
            action_type=rule.action_type,
            prompt=rule.prompt,
            query_template=rule.query_template or "",
            model_override=rule.model_override,
            is_active=rule.is_active,
            created=str(rule.created),
            updated=str(rule.updated),
        )
    except Exception as e:
        logger.error(f"Error creating pipeline rule: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating pipeline rule: {str(e)}"
        )


@router.put("/pipeline/rules/{rule_id}", response_model=PipelineRuleResponse)
async def update_pipeline_rule(rule_id: str, rule_data: PipelineRuleCreate):
    """Update an existing pipeline automation rule."""
    try:
        rule = await PipelineRule.get(rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Pipeline rule not found")

        rule.stage = rule_data.stage
        rule.action_type = rule_data.action_type
        rule.prompt = rule_data.prompt
        rule.query_template = rule_data.query_template or ""
        rule.model_override = rule_data.model_override
        rule.is_active = rule_data.is_active

        await rule.save()

        return PipelineRuleResponse(
            id=str(rule.id),
            stage=rule.stage,
            action_type=rule.action_type,
            prompt=rule.prompt,
            query_template=rule.query_template or "",
            model_override=rule.model_override,
            is_active=rule.is_active,
            created=str(rule.created),
            updated=str(rule.updated),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pipeline rule {rule_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating pipeline rule: {str(e)}"
        )


@router.delete("/pipeline/rules/{rule_id}")
async def delete_pipeline_rule(rule_id: str):
    """Delete a pipeline automation rule."""
    try:
        rule = await PipelineRule.get(rule_id)
        if not rule:
            raise HTTPException(status_code=404, detail="Pipeline rule not found")

        await rule.delete()
        return {"message": "Pipeline rule deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pipeline rule {rule_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deleting pipeline rule: {str(e)}"
        )


@router.get("/pipeline/status/{notebook_id}")
async def get_notebook_scanning_status(notebook_id: str):
    """Check if the given notebook has any active background crawler or search tasks running."""
    try:
        is_scanning = get_scanning_status(notebook_id)
        return {"scanning": is_scanning}
    except Exception as e:
        logger.error(f"Error getting scanning status for {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error getting scanning status: {str(e)}"
        )
