from typing import ClassVar, Optional

from open_notebook.domain.base import ObjectModel


class StyleGuide(ObjectModel):
    table_name: ClassVar[str] = "styleguide"
    nullable_fields: ClassVar[set[str]] = {
        "description",
        "guide_type",
        "title_font",
        "body_font",
        "title_size",
        "heading_size",
        "subheading_size",
        "body_size",
        "line_spacing",
        "logo_url",
        "strapline",
        "primary_color",
        "secondary_color",
        "accent_color",
        "page_size",
        "page_orientation",
        "margin_top",
        "margin_bottom",
        "margin_left",
        "margin_right",
        "heading_style",
        "color_scheme",
    }

    name: str = ""
    description: Optional[str] = ""
    guide_type: Optional[str] = "report"  # report, landing_page, two_pager, memo

    # Typography
    title_font: Optional[str] = "Inter"
    body_font: Optional[str] = "Inter"
    title_size: Optional[str] = "24pt"
    heading_size: Optional[str] = "18pt"
    subheading_size: Optional[str] = "14pt"
    body_size: Optional[str] = "11pt"
    line_spacing: Optional[str] = "1.5"

    # Branding
    logo_url: Optional[str] = ""
    strapline: Optional[str] = ""
    primary_color: Optional[str] = "#1a73e8"
    secondary_color: Optional[str] = "#34a853"
    accent_color: Optional[str] = "#fbbc04"

    # Layout
    page_size: Optional[str] = "letter"  # letter (8.5x11), a4, custom
    page_orientation: Optional[str] = "portrait"
    margin_top: Optional[str] = "1in"
    margin_bottom: Optional[str] = "1in"
    margin_left: Optional[str] = "1in"
    margin_right: Optional[str] = "1in"

    # Content Rules
    heading_style: Optional[str] = "bold"  # bold, underline, caps
    color_scheme: Optional[str] = "dark"  # dark, light, brand
    include_toc: Optional[bool] = True
    include_page_numbers: Optional[bool] = True
