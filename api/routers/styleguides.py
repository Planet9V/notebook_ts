from typing import List

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    StyleGuideCreate,
    StyleGuideResponse,
    StyleGuideUpdate,
)
from open_notebook.domain.styleguide import StyleGuide
from open_notebook.exceptions import InvalidInputError

router = APIRouter()


def _to_response(sg: StyleGuide) -> StyleGuideResponse:
    """Convert a StyleGuide domain object to a response model."""
    return StyleGuideResponse(
        id=sg.id or "",
        name=sg.name,
        description=sg.description or "",
        guide_type=sg.guide_type or "report",
        title_font=sg.title_font or "Inter",
        body_font=sg.body_font or "Inter",
        title_size=sg.title_size or "24pt",
        heading_size=sg.heading_size or "18pt",
        subheading_size=sg.subheading_size or "14pt",
        body_size=sg.body_size or "11pt",
        line_spacing=sg.line_spacing or "1.5",
        logo_url=sg.logo_url or "",
        strapline=sg.strapline or "",
        primary_color=sg.primary_color or "#1a73e8",
        secondary_color=sg.secondary_color or "#34a853",
        accent_color=sg.accent_color or "#fbbc04",
        page_size=sg.page_size or "letter",
        page_orientation=sg.page_orientation or "portrait",
        margin_top=sg.margin_top or "1in",
        margin_bottom=sg.margin_bottom or "1in",
        margin_left=sg.margin_left or "1in",
        margin_right=sg.margin_right or "1in",
        heading_style=sg.heading_style or "bold",
        color_scheme=sg.color_scheme or "dark",
        include_toc=sg.include_toc if sg.include_toc is not None else True,
        include_page_numbers=sg.include_page_numbers if sg.include_page_numbers is not None else True,
        created=str(sg.created) if sg.created else None,
        updated=str(sg.updated) if sg.updated else None,
    )


@router.get("/styleguides", response_model=List[StyleGuideResponse])
async def get_styleguides():
    """Get all style guides."""
    try:
        guides = await StyleGuide.get_all(order_by="name asc")
        return [_to_response(sg) for sg in guides]
    except Exception as e:
        logger.error(f"Error fetching style guides: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching style guides: {str(e)}")


@router.get("/styleguides/{styleguide_id}", response_model=StyleGuideResponse)
async def get_styleguide(styleguide_id: str):
    """Get a specific style guide by ID."""
    try:
        sg = await StyleGuide.get(styleguide_id)
        if not sg:
            raise HTTPException(status_code=404, detail="Style guide not found")
        return _to_response(sg)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching style guide {styleguide_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching style guide: {str(e)}")


@router.post("/styleguides", response_model=StyleGuideResponse)
async def create_styleguide(data: StyleGuideCreate):
    """Create a new style guide."""
    try:
        sg = StyleGuide(
            name=data.name,
            description=data.description or "",
            guide_type=data.guide_type or "report",
            title_font=data.title_font,
            body_font=data.body_font,
            title_size=data.title_size,
            heading_size=data.heading_size,
            subheading_size=data.subheading_size,
            body_size=data.body_size,
            line_spacing=data.line_spacing,
            logo_url=data.logo_url,
            strapline=data.strapline,
            primary_color=data.primary_color,
            secondary_color=data.secondary_color,
            accent_color=data.accent_color,
            page_size=data.page_size,
            page_orientation=data.page_orientation,
            margin_top=data.margin_top,
            margin_bottom=data.margin_bottom,
            margin_left=data.margin_left,
            margin_right=data.margin_right,
            heading_style=data.heading_style,
            color_scheme=data.color_scheme,
            include_toc=data.include_toc if data.include_toc is not None else True,
            include_page_numbers=data.include_page_numbers if data.include_page_numbers is not None else True,
        )
        await sg.save()
        return _to_response(sg)
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating style guide: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating style guide: {str(e)}")


@router.put("/styleguides/{styleguide_id}", response_model=StyleGuideResponse)
async def update_styleguide(styleguide_id: str, data: StyleGuideUpdate):
    """Update a style guide."""
    try:
        sg = await StyleGuide.get(styleguide_id)
        if not sg:
            raise HTTPException(status_code=404, detail="Style guide not found")

        # Update all fields from the request
        for field_name in data.model_fields_set:
            setattr(sg, field_name, getattr(data, field_name))

        await sg.save()
        return _to_response(sg)
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating style guide {styleguide_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating style guide: {str(e)}")


@router.delete("/styleguides/{styleguide_id}")
async def delete_styleguide(styleguide_id: str):
    """Delete a style guide."""
    try:
        sg = await StyleGuide.get(styleguide_id)
        if not sg:
            raise HTTPException(status_code=404, detail="Style guide not found")
        await sg.delete()
        return {"message": "Style guide deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting style guide {styleguide_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting style guide: {str(e)}")
