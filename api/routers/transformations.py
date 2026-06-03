from typing import List

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    DefaultPromptResponse,
    DefaultPromptUpdate,
    TransformationCreate,
    TransformationExecuteRequest,
    TransformationExecuteResponse,
    TransformationResponse,
    TransformationUpdate,
)
from open_notebook.ai.models import Model
from open_notebook.domain.transformation import DefaultPrompts, Transformation
from open_notebook.exceptions import InvalidInputError, OpenNotebookError
from open_notebook.graphs.transformation import graph as transformation_graph

router = APIRouter()


def _to_response(transformation: Transformation) -> TransformationResponse:
    """Build a TransformationResponse from a domain object."""
    return TransformationResponse(
        id=transformation.id or "",
        name=transformation.name,
        title=transformation.title,
        description=transformation.description,
        prompt=transformation.prompt,
        apply_default=transformation.apply_default,
        category=transformation.category,
        search_engine=transformation.search_engine,
        search_model_id=transformation.search_model_id,
        color_tag=transformation.color_tag,
        target_context=transformation.target_context,
        created=str(transformation.created),
        updated=str(transformation.updated),
    )


@router.get("/transformations", response_model=List[TransformationResponse])
async def get_transformations():
    """Get all transformations."""
    try:
        transformations = await Transformation.get_all(order_by="name asc")

        return [_to_response(t) for t in transformations]
    except Exception as e:
        logger.error(f"Error fetching transformations: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching transformations: {str(e)}"
        )


@router.post("/transformations", response_model=TransformationResponse)
async def create_transformation(transformation_data: TransformationCreate):
    """Create a new transformation."""
    try:
        new_transformation = Transformation(
            name=transformation_data.name,
            title=transformation_data.title,
            description=transformation_data.description,
            prompt=transformation_data.prompt,
            apply_default=transformation_data.apply_default,
            category=transformation_data.category,
            search_engine=transformation_data.search_engine,
            search_model_id=transformation_data.search_model_id,
            color_tag=transformation_data.color_tag,
            target_context=transformation_data.target_context,
        )
        await new_transformation.save()

        return _to_response(new_transformation)
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating transformation: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating transformation: {str(e)}"
        )


@router.post("/transformations/execute", response_model=TransformationExecuteResponse)
async def execute_transformation(execute_request: TransformationExecuteRequest):
    """Execute a transformation on input text."""
    try:
        # Validate transformation exists
        transformation = await Transformation.get(execute_request.transformation_id)
        if not transformation:
            raise HTTPException(status_code=404, detail="Transformation not found")

        # Validate model exists
        model = await Model.get(execute_request.model_id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")

        # Execute the transformation
        result = await transformation_graph.ainvoke(
            dict(  # type: ignore[arg-type]
                input_text=execute_request.input_text,
                transformation=transformation,
            ),
            config=dict(configurable={"model_id": execute_request.model_id}),
        )

        return TransformationExecuteResponse(
            output=result["output"],
            transformation_id=execute_request.transformation_id,
            model_id=execute_request.model_id,
        )

    except HTTPException:
        raise
    except OpenNotebookError:
        raise  # Let global exception handlers return proper status codes
    except Exception as e:
        logger.error(f"Error executing transformation: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error executing transformation: {str(e)}"
        )


@router.get("/transformations/default-prompt", response_model=DefaultPromptResponse)
async def get_default_prompt():
    """Get the default transformation prompt."""
    try:
        default_prompts: DefaultPrompts = await DefaultPrompts.get_instance()  # type: ignore[assignment]

        return DefaultPromptResponse(
            transformation_instructions=default_prompts.transformation_instructions
            or ""
        )
    except Exception as e:
        logger.error(f"Error fetching default prompt: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching default prompt: {str(e)}"
        )


@router.put("/transformations/default-prompt", response_model=DefaultPromptResponse)
async def update_default_prompt(prompt_update: DefaultPromptUpdate):
    """Update the default transformation prompt."""
    try:
        default_prompts: DefaultPrompts = await DefaultPrompts.get_instance()  # type: ignore[assignment]

        default_prompts.transformation_instructions = (
            prompt_update.transformation_instructions
        )
        await default_prompts.update()

        return DefaultPromptResponse(
            transformation_instructions=default_prompts.transformation_instructions
        )
    except Exception as e:
        logger.error(f"Error updating default prompt: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating default prompt: {str(e)}"
        )


@router.get(
    "/transformations/{transformation_id}", response_model=TransformationResponse
)
async def get_transformation(transformation_id: str):
    """Get a specific transformation by ID."""
    try:
        transformation = await Transformation.get(transformation_id)
        if not transformation:
            raise HTTPException(status_code=404, detail="Transformation not found")

        return _to_response(transformation)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transformation {transformation_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching transformation: {str(e)}"
        )


@router.put(
    "/transformations/{transformation_id}", response_model=TransformationResponse
)
async def update_transformation(
    transformation_id: str, transformation_update: TransformationUpdate
):
    """Update a transformation."""
    try:
        transformation = await Transformation.get(transformation_id)
        if not transformation:
            raise HTTPException(status_code=404, detail="Transformation not found")

        # Update only provided fields
        if transformation_update.name is not None:
            transformation.name = transformation_update.name
        if transformation_update.title is not None:
            transformation.title = transformation_update.title
        if transformation_update.description is not None:
            transformation.description = transformation_update.description
        if transformation_update.prompt is not None:
            transformation.prompt = transformation_update.prompt
        if transformation_update.apply_default is not None:
            transformation.apply_default = transformation_update.apply_default
        if transformation_update.category is not None:
            transformation.category = transformation_update.category
        if transformation_update.search_engine is not None:
            transformation.search_engine = transformation_update.search_engine
        if transformation_update.search_model_id is not None:
            transformation.search_model_id = transformation_update.search_model_id
        if transformation_update.color_tag is not None:
            transformation.color_tag = transformation_update.color_tag
        if transformation_update.target_context is not None:
            transformation.target_context = transformation_update.target_context

        await transformation.save()

        return _to_response(transformation)
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating transformation {transformation_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating transformation: {str(e)}"
        )


@router.delete("/transformations/{transformation_id}")
async def delete_transformation(transformation_id: str):
    """Delete a transformation."""
    try:
        transformation = await Transformation.get(transformation_id)
        if not transformation:
            raise HTTPException(status_code=404, detail="Transformation not found")

        await transformation.delete()

        return {"message": "Transformation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transformation {transformation_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deleting transformation: {str(e)}"
        )
