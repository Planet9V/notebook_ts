from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# Organization models
class OrganizationCreate(BaseModel):
    name: str
    type: Literal["admin", "customer"] = "customer"
    status: Literal["active", "suspended", "inactive"] = "active"


class OrganizationResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    created: str
    updated: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None


# Notebook models
class NotebookCreate(BaseModel):
    name: str = Field(..., description="Name of the notebook")
    description: str = Field(default="", description="Description of the notebook")
    stage: Optional[str] = Field("lead", description="Sales pipeline stage")
    client_name: Optional[str] = Field("", description="B2B Client target name")
    estimated_value: Optional[float] = Field(
        0.0, description="Estimated deal value in USD"
    )
    prospect_website: Optional[str] = Field(
        "", description="Prospect company website URL"
    )
    contacts: Optional[List[Dict[str, str]]] = Field(
        default_factory=list, description="Stakeholder contacts list"
    )
    crawl_failed: Optional[bool] = Field(
        False, description="Whether the last crawl failed"
    )
    suggested_contacts: Optional[List[Dict[str, str]]] = Field(
        default_factory=list, description="Stakeholder suggested contacts list"
    )
    customer_id: Optional[str] = Field(
        None, description="Optional Customer ID this notebook belongs to"
    )
    organization: Optional[str] = Field(
        None, description="Optional Organization ID this notebook belongs to"
    )
    assigned_to: Optional[str] = Field(
        None, description="Optional User ID assigned to this notebook"
    )
    close_date: Optional[str] = Field(
        None, description="Optional close date YYYY-MM-DD"
    )
    pipeline_type: Optional[str] = Field(
        "sales", description="Pipeline category workflow"
    )



class NotebookUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name of the notebook")
    description: Optional[str] = Field(None, description="Description of the notebook")
    archived: Optional[bool] = Field(
        None, description="Whether the notebook is archived"
    )
    stage: Optional[str] = Field(None, description="Sales pipeline stage")
    client_name: Optional[str] = Field(None, description="B2B Client target name")
    estimated_value: Optional[float] = Field(
        None, description="Estimated deal value in USD"
    )
    prospect_website: Optional[str] = Field(
        None, description="Prospect company website URL"
    )
    contacts: Optional[List[Dict[str, str]]] = Field(
        None, description="Stakeholder contacts list"
    )
    crawl_failed: Optional[bool] = Field(
        None, description="Whether the last crawl failed"
    )
    suggested_contacts: Optional[List[Dict[str, str]]] = Field(
        None, description="Stakeholder suggested contacts list"
    )
    customer_id: Optional[str] = Field(
        None, description="Optional Customer ID this notebook belongs to"
    )
    organization: Optional[str] = Field(
        None, description="Optional Organization ID this notebook belongs to"
    )
    assigned_to: Optional[str] = Field(
        None, description="Optional User ID assigned to this notebook"
    )
    close_date: Optional[str] = Field(
        None, description="Optional close date YYYY-MM-DD"
    )
    pipeline_type: Optional[str] = Field(
        None, description="Pipeline category workflow"
    )



class NotebookResponse(BaseModel):
    id: str
    name: str
    description: str
    archived: bool
    created: str
    updated: str
    source_count: int
    note_count: int
    stage: str
    client_name: str
    estimated_value: float
    prospect_website: str
    contacts: List[Dict[str, str]]
    crawl_failed: bool
    suggested_contacts: List[Dict[str, str]]
    customer_id: Optional[str] = None
    organization: Optional[str] = None
    assigned_to: Optional[str] = None
    close_date: Optional[str] = None
    pipeline_type: str = "sales"


# Asset models
class AssetCreate(BaseModel):
    notebook_id: str = Field(
        ..., description="ID of the notebook this asset belongs to"
    )
    node_id: str = Field(..., description="Node ID of the asset on the drawing canvas")
    type: str = Field(..., description="Type of the asset, e.g. plc, hmi, workstation")
    purdueLevel: int = Field(..., description="Purdue model level (0-5)")
    manufacturer: Optional[str] = Field(None, description="Manufacturer of the device")
    os_version: Optional[str] = Field(None, description="Operating system version")
    firmware_version: Optional[str] = Field(None, description="Firmware version")
    ip_address: Optional[str] = Field(None, description="IP address")
    mac_address: Optional[str] = Field(None, description="MAC address")
    subnet_mask: Optional[str] = Field(None, description="Subnet mask")
    hostname: Optional[str] = Field(None, description="Hostname")
    x: float = Field(..., description="X coordinate on the canvas")
    y: float = Field(..., description="Y coordinate on the canvas")
    parentId: Optional[str] = Field(None, description="Parent zone node ID")
    width: Optional[float] = Field(None, description="Width of zone node")
    height: Optional[float] = Field(None, description="Height of zone node")
    zone_sal: Optional[str] = Field(
        None, description="Security Assurance Level of zone"
    )
    zone_type: Optional[str] = Field(None, description="Zone type classification")


class AssetResponse(BaseModel):
    id: str = Field(..., description="Unique SurrealDB record ID for the asset")
    notebook_id: str = Field(
        ..., description="ID of the notebook this asset belongs to"
    )
    node_id: str = Field(..., description="Node ID of the asset on the drawing canvas")
    type: str = Field(..., description="Type of the asset, e.g. plc, hmi, workstation")
    purdueLevel: int = Field(..., description="Purdue model level (0-5)")
    manufacturer: Optional[str] = Field(None, description="Manufacturer of the device")
    os_version: Optional[str] = Field(None, description="Operating system version")
    firmware_version: Optional[str] = Field(None, description="Firmware version")
    ip_address: Optional[str] = Field(None, description="IP address")
    mac_address: Optional[str] = Field(None, description="MAC address")
    subnet_mask: Optional[str] = Field(None, description="Subnet mask")
    hostname: Optional[str] = Field(None, description="Hostname")
    x: float = Field(..., description="X coordinate on the canvas")
    y: float = Field(..., description="Y coordinate on the canvas")
    created: str = Field(..., description="Creation timestamp")
    updated: str = Field(..., description="Last update timestamp")
    parentId: Optional[str] = Field(None, description="Parent zone node ID")
    width: Optional[float] = Field(None, description="Width of zone node")
    height: Optional[float] = Field(None, description="Height of zone node")
    zone_sal: Optional[str] = Field(
        None, description="Security Assurance Level of zone"
    )
    zone_type: Optional[str] = Field(None, description="Zone type classification")


# Edge/Link models
class EdgeCreate(BaseModel):
    edge_id: str = Field(..., description="Unique client-side edge ID")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    protocol: Optional[str] = Field(
        None, description="Communication protocol (e.g. Modbus, HTTPS)"
    )
    encrypted: Optional[bool] = Field(
        None, description="Whether the connection is encrypted"
    )


class EdgeResponse(BaseModel):
    id: str = Field(..., description="Unique SurrealDB record ID for the edge")
    notebook_id: str = Field(..., description="ID of the notebook this edge belongs to")
    edge_id: str = Field(..., description="Unique client-side edge ID")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    protocol: Optional[str] = Field(None, description="Communication protocol")
    encrypted: Optional[bool] = Field(
        None, description="Whether the connection is encrypted"
    )
    created: str = Field(..., description="Creation timestamp")
    updated: str = Field(..., description="Last update timestamp")


# Search models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    type: Literal["vector", "hybrid"] = Field(
        "vector",
        description="Search type: vector (local KB) or hybrid (local KB + Valyu)",
    )
    limit: int = Field(100, description="Maximum number of results", le=1000)
    search_sources: bool = Field(True, description="Include sources in search")
    search_notes: bool = Field(True, description="Include notes in search")
    minimum_score: float = Field(
        0.2, description="Minimum score for vector search", ge=0, le=1
    )
    reranker: bool = Field(
        False,
        description="Whether to rerank results using the configured reranker model",
    )


class SearchResponse(BaseModel):
    results: List[Dict[str, Any]] = Field(..., description="Search results")
    total_count: int = Field(..., description="Total number of results")
    search_type: str = Field(..., description="Type of search performed")


class CompareRequest(BaseModel):
    query: str = Field(..., description="Search query for comparison")
    limit: int = Field(10, description="Maximum number of results to compare")


class CompareResponse(BaseModel):
    raw_latency_ms: float = Field(
        ..., description="Latency of raw vector search in milliseconds"
    )
    reranked_latency_ms: float = Field(
        ..., description="Latency of reranked search in milliseconds"
    )
    raw_results: List[Dict[str, Any]] = Field(
        ..., description="Results without reranking"
    )
    reranked_results: List[Dict[str, Any]] = Field(
        ..., description="Results with reranking"
    )


class AskRequest(BaseModel):
    question: str = Field(..., description="Question to ask the knowledge base")
    strategy_model: str = Field(..., description="Model ID for query strategy")
    answer_model: str = Field(..., description="Model ID for individual answers")
    final_answer_model: str = Field(..., description="Model ID for final answer")


class AskResponse(BaseModel):
    answer: str = Field(..., description="Final answer from the knowledge base")
    question: str = Field(..., description="Original question")


class ResearchRequest(BaseModel):
    query: str = Field(..., description="Research query or topic")
    engine: str = Field(
        "local", description="Research engine: local, perplexity, hybrid"
    )
    transformation_id: Optional[str] = Field(
        None, description="Optional transformation template ID to guide synthesis"
    )
    model_id: Optional[str] = Field(
        None, description="Optional Perplexity model ID override"
    )
    custom_prompt: Optional[str] = Field(
        None, description="Optional custom prompt instructions override"
    )
    output_formatting: Optional[str] = Field(
        None,
        description="Output formatting instructions for the Long-Context synthesis agent",
    )
    styleguide_id: Optional[str] = Field(
        None, description="Optional style guide ID for document formatting"
    )


class ResearchResponse(BaseModel):
    answer: str = Field(..., description="Detailed research findings and synthesis")
    sources: List[Dict[str, Any]] = Field(
        default_factory=list, description="Citations and web sources used"
    )


# Models API models
class ModelCreate(BaseModel):
    name: str = Field(
        ..., description="Name/identifier of the model (e.g., gpt-4, llama3)"
    )
    provider: str = Field(
        ..., description="Provider name (e.g., openai, anthropic, gemini)"
    )
    type: str = Field(
        ...,
        description="Model type (language, embedding, reranking, image_generation, audio, video, text_to_speech, speech_to_text)",
    )
    credential: Optional[str] = Field(
        None, description="Credential ID to link this model to"
    )
    context_length: Optional[int] = Field(
        None, description="Maximum context window size in tokens"
    )
    max_completion_tokens: Optional[int] = Field(
        None, description="Maximum completion tokens"
    )
    pricing_prompt: Optional[str] = Field(
        None, description="Cost per prompt token (string for precision)"
    )
    pricing_completion: Optional[str] = Field(
        None, description="Cost per completion token"
    )
    pricing_image: Optional[str] = Field(None, description="Cost per image token")
    pricing_audio: Optional[str] = Field(None, description="Cost per audio token")
    pricing_web_search: Optional[str] = Field(None, description="Cost per web search")
    pricing_internal_reasoning: Optional[str] = Field(
        None, description="Cost per internal reasoning token"
    )
    pricing_input_cache_read: Optional[str] = Field(
        None, description="Cost per cached input read"
    )
    pricing_input_cache_write: Optional[str] = Field(
        None, description="Cost per cached input write"
    )
    modality: Optional[str] = Field(
        None, description="Modality string (e.g. text->text, text+image->text+image)"
    )
    input_modalities: Optional[List[str]] = Field(
        None, description="Input modality list (text, image, audio, video, file)"
    )
    output_modalities: Optional[List[str]] = Field(
        None, description="Output modality list (text, image, audio)"
    )
    description: Optional[str] = Field(None, description="Model description")
    tokenizer: Optional[str] = Field(None, description="Tokenizer name")
    instruct_type: Optional[str] = Field(None, description="Instruction format type")
    hugging_face_id: Optional[str] = Field(None, description="HuggingFace model ID")
    canonical_slug: Optional[str] = Field(None, description="Canonical model slug")
    knowledge_cutoff: Optional[str] = Field(
        None, description="Training data cutoff date"
    )
    expiration_date: Optional[str] = Field(None, description="Model deprecation date")
    supported_parameters: Optional[List[str]] = Field(
        None, description="Supported API parameters"
    )
    is_moderated: Optional[bool] = Field(None, description="Whether model is moderated")
    provider_context_length: Optional[int] = Field(
        None, description="Provider-level context window"
    )


class ModelResponse(BaseModel):
    id: str
    name: str
    provider: str
    type: str
    credential: Optional[str] = None
    context_length: Optional[int] = None
    max_completion_tokens: Optional[int] = None
    pricing_prompt: Optional[str] = None
    pricing_completion: Optional[str] = None
    pricing_image: Optional[str] = None
    pricing_audio: Optional[str] = None
    pricing_web_search: Optional[str] = None
    pricing_internal_reasoning: Optional[str] = None
    pricing_input_cache_read: Optional[str] = None
    pricing_input_cache_write: Optional[str] = None
    modality: Optional[str] = None
    input_modalities: Optional[List[str]] = None
    output_modalities: Optional[List[str]] = None
    description: Optional[str] = None
    tokenizer: Optional[str] = None
    instruct_type: Optional[str] = None
    hugging_face_id: Optional[str] = None
    canonical_slug: Optional[str] = None
    knowledge_cutoff: Optional[str] = None
    expiration_date: Optional[str] = None
    supported_parameters: Optional[List[str]] = None
    is_moderated: Optional[bool] = None
    provider_context_length: Optional[int] = None
    openrouter_created_at: Optional[int] = None
    last_synced_at: Optional[str] = None
    created: str
    updated: str


class DefaultModelsResponse(BaseModel):
    default_chat_model: Optional[str] = None
    default_transformation_model: Optional[str] = None
    large_context_model: Optional[str] = None
    default_text_to_speech_model: Optional[str] = None
    default_speech_to_text_model: Optional[str] = None
    default_embedding_model: Optional[str] = None
    default_tools_model: Optional[str] = None
    default_reranker_model: Optional[str] = None


class ProviderAvailabilityResponse(BaseModel):
    available: List[str] = Field(..., description="List of available providers")
    unavailable: List[str] = Field(..., description="List of unavailable providers")
    supported_types: Dict[str, List[str]] = Field(
        ..., description="Provider to supported model types mapping"
    )


# Transformations API models
class TransformationCreate(BaseModel):
    name: str = Field(..., description="Transformation name")
    title: str = Field(..., description="Display title for the transformation")
    description: str = Field(
        ..., description="Description of what this transformation does"
    )
    prompt: str = Field(..., description="The transformation prompt")
    apply_default: bool = Field(
        False, description="Whether to apply this transformation by default"
    )
    # GTM Research extension fields
    category: Optional[str] = Field(
        "transformation", description="transformation or gtm_research"
    )
    search_engine: Optional[str] = Field(
        None, description="Default search engine for GTM research"
    )
    search_model_id: Optional[str] = Field(
        None, description="Model override for GTM research"
    )
    color_tag: Optional[str] = Field(
        None, description="Visual color tag (e.g. sky for light blue)"
    )
    target_context: Optional[str] = Field(
        None, description="market|presales|org_gtm|tech_gtm"
    )


class TransformationUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Transformation name")
    title: Optional[str] = Field(
        None, description="Display title for the transformation"
    )
    description: Optional[str] = Field(
        None, description="Description of what this transformation does"
    )
    prompt: Optional[str] = Field(None, description="The transformation prompt")
    apply_default: Optional[bool] = Field(
        None, description="Whether to apply this transformation by default"
    )
    category: Optional[str] = Field(None, description="transformation or gtm_research")
    search_engine: Optional[str] = Field(None, description="Default search engine")
    search_model_id: Optional[str] = Field(None, description="Model override")
    color_tag: Optional[str] = Field(None, description="Visual color tag")
    target_context: Optional[str] = Field(None, description="Research context type")


class TransformationResponse(BaseModel):
    id: str
    name: str
    title: str
    description: str
    prompt: str
    apply_default: bool
    category: Optional[str] = "transformation"
    search_engine: Optional[str] = None
    search_model_id: Optional[str] = None
    color_tag: Optional[str] = None
    target_context: Optional[str] = None
    created: str
    updated: str


class TransformationExecuteRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    transformation_id: str = Field(
        ..., description="ID of the transformation to execute"
    )
    input_text: str = Field(..., description="Text to transform")
    model_id: str = Field(..., description="Model ID to use for the transformation")


class TransformationExecuteResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    output: str = Field(..., description="Transformed text")
    transformation_id: str = Field(..., description="ID of the transformation used")
    model_id: str = Field(..., description="Model ID used")


# Default Prompt API models
class DefaultPromptResponse(BaseModel):
    transformation_instructions: str = Field(
        ..., description="Default transformation instructions"
    )


class DefaultPromptUpdate(BaseModel):
    transformation_instructions: str = Field(
        ..., description="Default transformation instructions"
    )


# Notes API models
class NoteCreate(BaseModel):
    title: Optional[str] = Field(None, description="Note title")
    content: str = Field(..., description="Note content")
    note_type: Optional[str] = Field("human", description="Type of note (human, ai)")
    notebook_id: Optional[str] = Field(
        None, description="Notebook ID to add the note to"
    )
    location_id: Optional[str] = Field(
        None, description="Location/facility ID to attach the note to"
    )
    customer_id: Optional[str] = Field(
        None, description="Customer/organization ID to attach the note to"
    )


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Note title")
    content: Optional[str] = Field(None, description="Note content")
    note_type: Optional[str] = Field(None, description="Type of note (human, ai)")


class NoteResponse(BaseModel):
    id: str
    title: Optional[str]
    content: Optional[str]
    note_type: Optional[str]
    created: str
    updated: str
    command_id: Optional[str] = None
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    customer_id: Optional[str] = None


class LocationNotesRollup(BaseModel):
    """Notes rollup for a single location/facility."""
    location_id: str
    facility_name: str
    note_count: int
    latest_note_date: Optional[str] = None
    notes: List[NoteResponse]


class CustomerNotesRollup(BaseModel):
    """Rolled-up notes view for a customer: direct notes + location notes."""
    customer_id: str
    direct_notes: List[NoteResponse]
    locations: List[LocationNotesRollup]
    total_note_count: int


# Embedding API models
class EmbedRequest(BaseModel):
    item_id: str = Field(..., description="ID of the item to embed")
    item_type: str = Field(..., description="Type of item (source, note)")
    async_processing: bool = Field(
        False, description="Process asynchronously in background"
    )


class EmbedResponse(BaseModel):
    success: bool = Field(..., description="Whether embedding was successful")
    message: str = Field(..., description="Result message")
    item_id: str = Field(..., description="ID of the item that was embedded")
    item_type: str = Field(..., description="Type of item that was embedded")
    command_id: Optional[str] = Field(
        None, description="Command ID for async processing"
    )


# Rebuild request/response models
class RebuildRequest(BaseModel):
    mode: Literal["existing", "all"] = Field(
        ...,
        description="Rebuild mode: 'existing' only re-embeds items with embeddings, 'all' embeds everything",
    )
    include_sources: bool = Field(True, description="Include sources in rebuild")
    include_notes: bool = Field(True, description="Include notes in rebuild")
    include_insights: bool = Field(True, description="Include insights in rebuild")


class RebuildResponse(BaseModel):
    command_id: str = Field(..., description="Command ID to track progress")
    total_items: int = Field(..., description="Estimated number of items to process")
    message: str = Field(..., description="Status message")


class RebuildProgress(BaseModel):
    processed: int = Field(..., description="Number of items processed")
    total: int = Field(..., description="Total items to process")
    percentage: float = Field(..., description="Progress percentage")


class RebuildStats(BaseModel):
    sources: int = Field(0, description="Sources processed")
    notes: int = Field(0, description="Notes processed")
    insights: int = Field(0, description="Insights processed")
    failed: int = Field(0, description="Failed items")


class RebuildStatusResponse(BaseModel):
    command_id: str = Field(..., description="Command ID")
    status: str = Field(..., description="Status: queued, running, completed, failed")
    progress: Optional[RebuildProgress] = None
    stats: Optional[RebuildStats] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


# Settings API models
class SettingsResponse(BaseModel):
    default_content_processing_engine_doc: Optional[str] = None
    default_content_processing_engine_url: Optional[str] = None
    default_embedding_option: Optional[str] = None
    auto_delete_files: Optional[str] = None
    youtube_preferred_languages: Optional[List[str]] = None


class SettingsUpdate(BaseModel):
    default_content_processing_engine_doc: Optional[str] = None
    default_content_processing_engine_url: Optional[str] = None
    default_embedding_option: Optional[str] = None
    auto_delete_files: Optional[str] = None
    youtube_preferred_languages: Optional[List[str]] = None


# Sources API models
class AssetModel(BaseModel):
    file_path: Optional[str] = None
    url: Optional[str] = None


class SourceCreate(BaseModel):
    # Backward compatibility: support old single notebook_id
    notebook_id: Optional[str] = Field(
        None, description="Notebook ID to add the source to (deprecated, use notebooks)"
    )
    # New multi-notebook support
    notebooks: Optional[List[str]] = Field(
        None, description="List of notebook IDs to add the source to"
    )
    # Required fields
    type: str = Field(..., description="Source type: link, upload, or text")
    url: Optional[str] = Field(None, description="URL for link type")
    file_path: Optional[str] = Field(None, description="File path for upload type")
    content: Optional[str] = Field(None, description="Text content for text type")
    title: Optional[str] = Field(None, description="Source title")
    transformations: Optional[List[str]] = Field(
        default_factory=list, description="Transformation IDs to apply"
    )
    embed: bool = Field(False, description="Whether to embed content for vector search")
    delete_source: bool = Field(
        False, description="Whether to delete uploaded file after processing"
    )
    # New async processing support
    async_processing: bool = Field(
        False, description="Whether to process source asynchronously"
    )

    @model_validator(mode="after")
    def validate_notebook_fields(self):
        # Gracefully merge notebook_id into notebooks if both are provided
        if self.notebooks is None:
            self.notebooks = []

        if self.notebook_id is not None:
            if self.notebook_id not in self.notebooks:
                self.notebooks.append(self.notebook_id)

        return self


class SourceUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Source title")
    topics: Optional[List[str]] = Field(None, description="Source topics")


class SourceResponse(BaseModel):
    id: str
    title: Optional[str]
    topics: Optional[List[str]]
    asset: Optional[AssetModel]
    full_text: Optional[str]
    embedded: bool
    embedded_chunks: int
    file_available: Optional[bool] = None
    created: str
    updated: str
    # New fields for async processing
    command_id: Optional[str] = None
    status: Optional[str] = None
    processing_info: Optional[Dict] = None
    # Notebook associations
    notebooks: Optional[List[str]] = None


class SourceListResponse(BaseModel):
    id: str
    title: Optional[str]
    topics: Optional[List[str]]
    asset: Optional[AssetModel]
    embedded: bool  # Boolean flag indicating if source has embeddings
    embedded_chunks: int  # Number of embedded chunks
    insights_count: int
    created: str
    updated: str
    file_available: Optional[bool] = None
    # Status fields for async processing
    command_id: Optional[str] = None
    status: Optional[str] = None
    processing_info: Optional[Dict[str, Any]] = None


# Context API models
class ContextConfig(BaseModel):
    sources: Dict[str, str] = Field(
        default_factory=dict, description="Source inclusion config {source_id: level}"
    )
    notes: Dict[str, str] = Field(
        default_factory=dict, description="Note inclusion config {note_id: level}"
    )


class ContextRequest(BaseModel):
    notebook_id: str = Field(..., description="Notebook ID to get context for")
    context_config: Optional[ContextConfig] = Field(
        None, description="Context configuration"
    )


class ContextResponse(BaseModel):
    notebook_id: str
    sources: List[Dict[str, Any]] = Field(..., description="Source context data")
    notes: List[Dict[str, Any]] = Field(..., description="Note context data")
    total_tokens: Optional[int] = Field(None, description="Estimated token count")


# Insights API models
class SourceInsightResponse(BaseModel):
    id: str
    source_id: str
    insight_type: str
    content: str
    created: str
    updated: str


class InsightCreationResponse(BaseModel):
    """Response for async insight creation."""

    status: Literal["pending"] = "pending"
    message: str = "Insight generation started"
    source_id: str
    transformation_id: str
    command_id: Optional[str] = None


class SaveAsNoteRequest(BaseModel):
    notebook_id: Optional[str] = Field(None, description="Notebook ID to add note to")


class CreateSourceInsightRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    transformation_id: str = Field(..., description="ID of transformation to apply")
    model_id: Optional[str] = Field(
        None, description="Model ID (uses default if not provided)"
    )


# Source status response
class SourceStatusResponse(BaseModel):
    status: Optional[str] = Field(None, description="Processing status")
    message: str = Field(..., description="Descriptive message about the status")
    processing_info: Optional[Dict[str, Any]] = Field(
        None, description="Detailed processing information"
    )
    command_id: Optional[str] = Field(None, description="Command ID if available")


# Error response
class ErrorResponse(BaseModel):
    error: str
    message: str


# API Key Configuration models
class SetApiKeyRequest(BaseModel):
    """Request to set an API key for a provider."""

    api_key: Optional[str] = Field(None, description="API key for the provider")
    base_url: Optional[str] = Field(
        None, description="Base URL for URL-based providers (Ollama, OpenAI-compatible)"
    )
    endpoint: Optional[str] = Field(None, description="Endpoint URL for Azure OpenAI")
    api_version: Optional[str] = Field(None, description="API version for Azure OpenAI")
    endpoint_llm: Optional[str] = Field(
        None, description="Service-specific endpoint for LLM (Azure)"
    )
    endpoint_embedding: Optional[str] = Field(
        None, description="Service-specific endpoint for embedding (Azure)"
    )
    endpoint_stt: Optional[str] = Field(
        None, description="Service-specific endpoint for STT (Azure)"
    )
    endpoint_tts: Optional[str] = Field(
        None, description="Service-specific endpoint for TTS (Azure)"
    )
    service_type: Optional[Literal["llm", "embedding", "stt", "tts"]] = Field(
        None,
        description="Service type for OpenAI-compatible providers (llm, embedding, stt, tts)",
    )
    # Vertex AI specific fields
    vertex_project: Optional[str] = Field(
        None, description="Google Cloud Project ID for Vertex AI"
    )
    vertex_location: Optional[str] = Field(
        None, description="Google Cloud Region for Vertex AI (e.g., us-central1)"
    )
    vertex_credentials_path: Optional[str] = Field(
        None, description="Path to Google Cloud service account JSON file"
    )

    @field_validator(
        "api_key",
        "base_url",
        "endpoint",
        "api_version",
        "endpoint_llm",
        "endpoint_embedding",
        "endpoint_stt",
        "endpoint_tts",
        "vertex_project",
        "vertex_location",
        "vertex_credentials_path",
        mode="before",
    )
    @classmethod
    def validate_not_empty_string(cls, v: Optional[str]) -> Optional[str]:
        """Reject empty strings - convert to None or raise error."""
        if v is not None:
            stripped = v.strip()
            if not stripped:
                return None  # Treat empty/whitespace-only as None
            return stripped
        return v


class ApiKeyStatusResponse(BaseModel):
    """Response showing which providers are configured and their source."""

    configured: Dict[str, bool] = Field(
        ..., description="Map of provider name to whether it is configured"
    )
    source: Dict[str, Literal["database", "environment", "none"]] = Field(
        ...,
        description="Map of provider name to configuration source (database, environment, or none)",
    )
    encryption_configured: bool = Field(
        ...,
        description="Whether OPEN_NOTEBOOK_ENCRYPTION_KEY is set (required to store keys in database)",
    )


class TestConnectionResponse(BaseModel):
    """Response from testing a provider connection."""

    provider: str = Field(..., description="Provider name that was tested")
    success: bool = Field(..., description="Whether connection test succeeded")
    message: str = Field(..., description="Result message with details")


class MigrateFromEnvRequest(BaseModel):
    """Request to migrate API keys from environment variables to database."""

    force: bool = Field(
        False, description="Force overwrite existing database configurations"
    )


class MigrationResult(BaseModel):
    """Response from migrating API keys from environment to database."""

    message: str = Field(..., description="Summary message")
    migrated: List[str] = Field(
        default_factory=list, description="Providers successfully migrated"
    )
    skipped: List[str] = Field(
        default_factory=list, description="Providers skipped (already in DB)"
    )
    errors: List[str] = Field(
        default_factory=list, description="Migration errors by provider"
    )


# Notebook delete cascade models
# Credential models
class CreateCredentialRequest(BaseModel):
    """Request to create a new credential."""

    name: str = Field(..., description="Credential name")
    provider: str = Field(..., description="Provider name (openai, anthropic, etc.)")
    modalities: List[str] = Field(
        default_factory=list,
        description="Supported modalities (language, embedding, text_to_speech, speech_to_text)",
    )
    api_key: Optional[str] = Field(None, description="API key (stored encrypted)")
    base_url: Optional[str] = Field(None, description="Base URL")
    endpoint: Optional[str] = Field(None, description="Endpoint URL (Azure)")
    api_version: Optional[str] = Field(None, description="API version (Azure)")
    endpoint_llm: Optional[str] = Field(None, description="LLM endpoint")
    endpoint_embedding: Optional[str] = Field(None, description="Embedding endpoint")
    endpoint_stt: Optional[str] = Field(None, description="STT endpoint")
    endpoint_tts: Optional[str] = Field(None, description="TTS endpoint")
    project: Optional[str] = Field(None, description="Project ID (Vertex)")
    location: Optional[str] = Field(None, description="Location (Vertex)")
    credentials_path: Optional[str] = Field(
        None, description="Credentials file path (Vertex)"
    )
    client_id: Optional[str] = Field(None, description="OAuth client ID")
    client_secret: Optional[str] = Field(None, description="OAuth client secret")
    redirect_uri: Optional[str] = Field(None, description="OAuth redirect URI")
    scopes: Optional[List[str]] = Field(None, description="OAuth scopes list")
    refresh_token: Optional[str] = Field(None, description="OAuth refresh token")


class UpdateCredentialRequest(BaseModel):
    """Request to update an existing credential."""

    name: Optional[str] = Field(None, description="Credential name")
    modalities: Optional[List[str]] = Field(None, description="Supported modalities")
    api_key: Optional[str] = Field(None, description="API key (stored encrypted)")
    base_url: Optional[str] = Field(None, description="Base URL")
    endpoint: Optional[str] = Field(None, description="Endpoint URL")
    api_version: Optional[str] = Field(None, description="API version")
    endpoint_llm: Optional[str] = Field(None, description="LLM endpoint")
    endpoint_embedding: Optional[str] = Field(None, description="Embedding endpoint")
    endpoint_stt: Optional[str] = Field(None, description="STT endpoint")
    endpoint_tts: Optional[str] = Field(None, description="TTS endpoint")
    project: Optional[str] = Field(None, description="Project ID")
    location: Optional[str] = Field(None, description="Location")
    credentials_path: Optional[str] = Field(None, description="Credentials path")
    client_id: Optional[str] = Field(None, description="OAuth client ID")
    client_secret: Optional[str] = Field(None, description="OAuth client secret")
    redirect_uri: Optional[str] = Field(None, description="OAuth redirect URI")
    scopes: Optional[List[str]] = Field(None, description="OAuth scopes list")
    refresh_token: Optional[str] = Field(None, description="OAuth refresh token")


class CredentialResponse(BaseModel):
    """Response for a credential (never includes api_key)."""

    id: str
    name: str
    provider: str
    modalities: List[str]
    base_url: Optional[str] = None
    endpoint: Optional[str] = None
    api_version: Optional[str] = None
    endpoint_llm: Optional[str] = None
    endpoint_embedding: Optional[str] = None
    endpoint_stt: Optional[str] = None
    endpoint_tts: Optional[str] = None
    project: Optional[str] = None
    location: Optional[str] = None
    credentials_path: Optional[str] = None
    has_api_key: bool = False
    created: str
    updated: str
    model_count: int = 0
    decryption_error: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: Optional[str] = None
    scopes: Optional[List[str]] = None
    refresh_token: Optional[str] = None
    has_client_secret: bool = False
    has_refresh_token: bool = False


class CredentialDeleteResponse(BaseModel):
    """Response for credential deletion."""

    message: str
    deleted_models: int = 0


class DiscoveredModelResponse(BaseModel):
    """A model discovered from a provider."""

    name: str
    provider: str
    model_type: Optional[str] = None
    description: Optional[str] = None


class DiscoverModelsResponse(BaseModel):
    """Response from model discovery."""

    credential_id: str
    provider: str
    discovered: List[DiscoveredModelResponse]


class RegisterModelData(BaseModel):
    """A model to register with user-specified type."""

    name: str
    provider: str
    model_type: str  # Required: user specifies the type


class RegisterModelsRequest(BaseModel):
    """Request to register discovered models."""

    models: List[RegisterModelData]


class RegisterModelsResponse(BaseModel):
    """Response from model registration."""

    created: int
    existing: int


class NotebookDeletePreview(BaseModel):
    notebook_id: str = Field(..., description="ID of the notebook")
    notebook_name: str = Field(..., description="Name of the notebook")
    note_count: int = Field(..., description="Number of notes that will be deleted")
    exclusive_source_count: int = Field(
        ..., description="Number of sources only in this notebook"
    )
    shared_source_count: int = Field(
        ..., description="Number of sources shared with other notebooks"
    )


class NotebookDeleteResponse(BaseModel):
    message: str = Field(..., description="Success message")
    deleted_notes: int = Field(..., description="Number of notes deleted")
    deleted_sources: int = Field(..., description="Number of exclusive sources deleted")
    unlinked_sources: int = Field(
        ..., description="Number of sources unlinked from notebook"
    )


# Pipeline Rule models
class PipelineRuleCreate(BaseModel):
    stage: str = Field(..., description="Target Kanban stage")
    action_type: Literal["crawl", "search"] = Field(
        ..., description="Action type: crawl or search"
    )
    prompt: str = Field(..., description="AI instruction prompt")
    query_template: Optional[str] = Field(
        "", description="Query template for search engine"
    )
    model_override: Optional[str] = Field(
        None, description="Optional specific model ID to use"
    )
    search_engine: Optional[str] = Field(
        "default",
        description="Search engine to use: default, valyu, perplexity, brave, duckduckgo",
    )
    is_active: bool = Field(True, description="Whether this automation rule is active")


class PipelineRuleResponse(BaseModel):
    id: str
    stage: str
    action_type: str
    prompt: str
    query_template: str
    model_override: Optional[str] = None
    search_engine: Optional[str] = "default"
    is_active: bool
    created: str
    updated: str


# Graph Validation models
class GraphNode(BaseModel):
    id: str
    type: str
    purdueLevel: int
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    subnet_mask: Optional[str] = None
    hostname: Optional[str] = None
    manufacturer: Optional[str] = None
    os_version: Optional[str] = None
    firmware_version: Optional[str] = None
    parentId: Optional[str] = None
    width: Optional[float] = None
    height: Optional[float] = None
    zone_sal: Optional[str] = None
    zone_type: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    protocol: Optional[str] = None
    encrypted: Optional[bool] = None


class GraphValidationRequest(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class GraphValidationResponse(BaseModel):
    violatedNodes: List[str]
    violatedEdges: List[str]
    threatPaths: List[List[str]]
    verifiedRequirements: List[str]
    nodeViolations: Optional[Dict[str, List[str]]] = None
    edgeViolations: Optional[Dict[str, List[str]]] = None


# Customer models
class CustomerCreate(BaseModel):
    # === Existing fields ===
    name: str = Field(..., description="Name of the customer company")
    website: Optional[str] = Field("", description="Website URL of the customer")
    description: Optional[str] = Field("", description="Description of the customer")
    industry: Optional[str] = Field("", description="Industry sector of the customer")
    primary_sector: Optional[str] = Field(
        "", description="Primary CISA critical infrastructure sector"
    )
    sectors: Optional[List[str]] = Field(
        default_factory=list, description="All mapped CISA sectors"
    )
    assigned_frameworks: Optional[List[str]] = Field(
        default_factory=list, description="Assigned CSET compliance frameworks list"
    )
    contacts: Optional[List[Dict[str, str]]] = Field(
        default_factory=list,
        description="Legacy inline contacts (deprecated, use contact table)",
    )
    # === Address ===
    street_address: Optional[str] = Field("", description="Street address")
    street_address_2: Optional[str] = Field("", description="Suite/unit")
    city: Optional[str] = Field("", description="City")
    state: Optional[str] = Field("", description="State/province")
    postal_code: Optional[str] = Field("", description="ZIP/postal code")
    country: Optional[str] = Field("US", description="ISO country code")
    # === Communication ===
    phone: Optional[str] = Field("", description="Main phone number")
    phone_alt: Optional[str] = Field("", description="Alternative phone")
    fax: Optional[str] = Field("", description="Fax number")
    email: Optional[str] = Field("", description="Company email")
    # === Sales ===
    salesperson: Optional[str] = Field("", description="Assigned sales rep")
    lead_source: Optional[str] = Field("", description="Lead acquisition source")
    annual_revenue: Optional[float] = Field(None, description="Annual revenue USD")
    employee_count: Optional[int] = Field(None, description="Number of employees")
    # === Classification ===
    customer_type: Optional[str] = Field(
        "prospect", description="prospect, client, partner, vendor"
    )
    tier: Optional[str] = Field("smb", description="enterprise, mid_market, smb")
    status: Optional[str] = Field("active", description="active, inactive, churned")
    # === Engagement ===
    last_contact_date: Optional[str] = Field(
        None, description="ISO datetime of last interaction"
    )
    next_followup: Optional[str] = Field(
        None, description="ISO datetime of next action"
    )
    engagement_score: Optional[int] = Field(0, description="0-100 engagement score")
    # === Social ===
    linkedin_url: Optional[str] = Field("", description="Company LinkedIn URL")
    twitter_url: Optional[str] = Field("", description="Company X/Twitter URL")
    facebook_url: Optional[str] = Field("", description="Company Facebook URL")
    # === Metadata ===
    tags: Optional[List[str]] = Field(
        default_factory=list, description="Freeform tags for filtering"
    )
    internal_notes: Optional[str] = Field("", description="Private internal notes")
    import_batch_id: Optional[str] = Field(None, description="Import batch identifier")
    import_source: Optional[str] = Field(
        None, description="Source file name if imported"
    )


class CustomerUpdate(BaseModel):
    # === Existing fields ===
    name: Optional[str] = Field(None, description="Name of the customer company")
    website: Optional[str] = Field(None, description="Website URL of the customer")
    description: Optional[str] = Field(None, description="Description of the customer")
    industry: Optional[str] = Field(None, description="Industry sector of the customer")
    primary_sector: Optional[str] = Field(
        None, description="Primary CISA critical infrastructure sector"
    )
    sectors: Optional[List[str]] = Field(None, description="All mapped CISA sectors")
    assigned_frameworks: Optional[List[str]] = Field(
        None, description="Assigned CSET compliance frameworks list"
    )
    contacts: Optional[List[Dict[str, str]]] = Field(
        None, description="Legacy inline contacts"
    )
    # === Address ===
    street_address: Optional[str] = Field(None, description="Street address")
    street_address_2: Optional[str] = Field(None, description="Suite/unit")
    city: Optional[str] = Field(None, description="City")
    state: Optional[str] = Field(None, description="State/province")
    postal_code: Optional[str] = Field(None, description="ZIP/postal code")
    country: Optional[str] = Field(None, description="ISO country code")
    # === Communication ===
    phone: Optional[str] = Field(None, description="Main phone number")
    phone_alt: Optional[str] = Field(None, description="Alternative phone")
    fax: Optional[str] = Field(None, description="Fax number")
    email: Optional[str] = Field(None, description="Company email")
    # === Sales ===
    salesperson: Optional[str] = Field(None, description="Assigned sales rep")
    lead_source: Optional[str] = Field(None, description="Lead acquisition source")
    annual_revenue: Optional[float] = Field(None, description="Annual revenue USD")
    employee_count: Optional[int] = Field(None, description="Number of employees")
    # === Classification ===
    customer_type: Optional[str] = Field(
        None, description="prospect, client, partner, vendor"
    )
    tier: Optional[str] = Field(None, description="enterprise, mid_market, smb")
    status: Optional[str] = Field(None, description="active, inactive, churned")
    # === Engagement ===
    last_contact_date: Optional[str] = Field(
        None, description="ISO datetime of last interaction"
    )
    next_followup: Optional[str] = Field(
        None, description="ISO datetime of next action"
    )
    engagement_score: Optional[int] = Field(None, description="0-100 engagement score")
    # === Social ===
    linkedin_url: Optional[str] = Field(None, description="Company LinkedIn URL")
    twitter_url: Optional[str] = Field(None, description="Company X/Twitter URL")
    facebook_url: Optional[str] = Field(None, description="Company Facebook URL")
    # === Metadata ===
    tags: Optional[List[str]] = Field(None, description="Freeform tags for filtering")
    internal_notes: Optional[str] = Field(None, description="Private internal notes")
    import_batch_id: Optional[str] = Field(None, description="Import batch identifier")
    import_source: Optional[str] = Field(
        None, description="Source file name if imported"
    )


class CustomerResponse(BaseModel):
    id: str
    name: str
    # === Existing fields ===
    website: str = ""
    description: str = ""
    industry: str = ""
    primary_sector: str = ""
    sectors: List[str] = Field(default_factory=list)
    assigned_frameworks: List[str] = Field(default_factory=list)
    contacts: List[Dict[str, str]] = Field(default_factory=list)
    # === Address ===
    street_address: str = ""
    street_address_2: str = ""
    city: str = ""
    state: str = ""
    postal_code: str = ""
    country: str = "US"
    # === Communication ===
    phone: str = ""
    phone_alt: str = ""
    fax: str = ""
    email: str = ""
    # === Sales ===
    salesperson: str = ""
    lead_source: str = ""
    annual_revenue: Optional[float] = None
    employee_count: Optional[int] = None
    # === Classification ===
    customer_type: str = "prospect"
    tier: str = "smb"
    status: str = "active"
    # === Engagement ===
    last_contact_date: Optional[str] = None
    next_followup: Optional[str] = None
    engagement_score: int = 0
    # === Social ===
    linkedin_url: str = ""
    twitter_url: str = ""
    facebook_url: str = ""
    # === Metadata ===
    tags: List[str] = Field(default_factory=list)
    internal_notes: str = ""
    import_batch_id: Optional[str] = None
    import_source: Optional[str] = None
    # === Timestamps ===
    created: str
    updated: str


class CustomerMetricsResponse(CustomerResponse):
    notebook_count: int = Field(0, description="Number of associated notebooks")
    total_value: float = Field(
        0.0, description="Sum of associated notebooks estimated deal value"
    )
    compliance_progress: float = Field(
        0.0, description="Average security compliance progress percentage"
    )
    contact_count: int = Field(0, description="Number of first-class contacts")
    engagement_breakdown: Optional[Dict[str, Any]] = Field(
        None, description="Engagement score component breakdown"
    )


# Contact models
class ContactCreate(BaseModel):
    first_name: str = Field(..., description="Contact first name")
    last_name: str = Field(..., description="Contact last name")
    email: Optional[str] = Field("", description="Email address")
    phone: Optional[str] = Field("", description="Direct phone")
    mobile: Optional[str] = Field("", description="Mobile phone")
    title: Optional[str] = Field("", description="Job title")
    department: Optional[str] = Field("", description="Department")
    seniority: Optional[str] = Field(
        "", description="C-level, VP, Director, Manager, Individual"
    )
    linkedin_url: Optional[str] = Field("", description="Personal LinkedIn URL")
    customer_id: Optional[str] = Field(None, description="Associated customer ID")
    location_ids: Optional[List[str]] = Field(default_factory=list, description="Associated location IDs")
    status: Optional[str] = Field("active", description="active, inactive, bounced")
    tags: Optional[List[str]] = Field(default_factory=list, description="Freeform tags")
    notes: Optional[str] = Field("", description="Private notes about contact")
    source: Optional[str] = Field(
        "manual", description="How acquired: manual, import, scraped"
    )


class ContactUpdate(BaseModel):
    first_name: Optional[str] = Field(None, description="Contact first name")
    last_name: Optional[str] = Field(None, description="Contact last name")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Direct phone")
    mobile: Optional[str] = Field(None, description="Mobile phone")
    title: Optional[str] = Field(None, description="Job title")
    department: Optional[str] = Field(None, description="Department")
    seniority: Optional[str] = Field(None, description="Seniority level")
    linkedin_url: Optional[str] = Field(None, description="Personal LinkedIn URL")
    customer_id: Optional[str] = Field(None, description="Associated customer ID")
    location_ids: Optional[List[str]] = Field(None, description="Associated location IDs")
    status: Optional[str] = Field(None, description="active, inactive, bounced")
    tags: Optional[List[str]] = Field(None, description="Freeform tags")
    notes: Optional[str] = Field(None, description="Private notes about contact")
    last_contacted: Optional[str] = Field(
        None, description="ISO datetime of last interaction"
    )
    source: Optional[str] = Field(None, description="How acquired")


class ContactResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    full_name: str = ""
    email: str = ""
    phone: str = ""
    mobile: str = ""
    title: str = ""
    department: str = ""
    seniority: str = ""
    linkedin_url: str = ""
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    location_ids: List[str] = Field(default_factory=list)
    location_names: List[str] = Field(default_factory=list)
    status: str = "active"
    tags: List[str] = Field(default_factory=list)
    notes: str = ""
    last_contacted: Optional[str] = None
    source: str = "manual"
    import_batch_id: Optional[str] = None
    created: str
    updated: str


# Location models
class LocationCreate(BaseModel):
    customer_id: Optional[str] = Field(None, description="Associated customer ID")
    organization_name: Optional[str] = Field("", description="Organization Name")
    facility_name: str = Field(..., description="Facility Name")
    facility_type: Optional[str] = Field("", description="Facility Type")
    sectors: Optional[List[str]] = Field(default_factory=list, description="Sectors drop down")
    address: Optional[str] = Field("", description="Address")
    country: Optional[str] = Field("", description="Country")
    zip_code: Optional[str] = Field("", description="Zip Code")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Longitude coordinate")
    description: Optional[str] = Field("", description="Location description")


class LocationUpdate(BaseModel):
    organization_name: Optional[str] = Field(None, description="Organization Name")
    facility_name: Optional[str] = Field(None, description="Facility Name")
    facility_type: Optional[str] = Field(None, description="Facility Type")
    sectors: Optional[List[str]] = Field(None, description="Sectors list")
    address: Optional[str] = Field(None, description="Address")
    country: Optional[str] = Field(None, description="Country")
    zip_code: Optional[str] = Field(None, description="Zip Code")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Longitude coordinate")
    description: Optional[str] = Field(None, description="Location description")


class LocationResponse(BaseModel):
    id: str
    customer_id: Optional[str] = None
    organization_name: str = ""
    facility_name: str
    facility_type: str = ""
    sectors: List[str] = Field(default_factory=list)
    address: str = ""
    country: str = ""
    zip_code: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: str = ""
    created: str
    updated: str


# Import / Export models
class ImportPreviewResponse(BaseModel):
    file_name: str = Field(..., description="Uploaded file name")
    total_rows: int = Field(..., description="Number of data rows detected")
    columns: List[str] = Field(..., description="Column headers from the file")
    sample_rows: List[List[str]] = Field(
        ..., description="First N sample rows for preview"
    )
    suggested_mapping: Dict[str, str] = Field(
        default_factory=dict, description="Auto-detected column-to-field mapping"
    )
    available_customer_fields: List[str] = Field(
        default_factory=list, description="Valid customer target fields"
    )
    available_contact_fields: List[str] = Field(
        default_factory=list, description="Valid contact target fields"
    )


class ImportOptions(BaseModel):
    create_notebooks: bool = Field(
        True, description="Create a notebook for each imported customer"
    )
    notebook_stage: str = Field(
        "bulk_import", description="Pipeline stage for auto-created notebooks"
    )
    default_customer_type: str = Field(
        "prospect", description="Default customer type for imports"
    )
    default_tier: str = Field("smb", description="Default tier for imports")
    default_lead_source: str = Field(
        "csv_import", description="Lead source tag for imports"
    )
    duplicate_strategy: str = Field("skip", description="skip, update, or create")
    tags: Optional[List[str]] = Field(
        default_factory=list, description="Tags to apply to all imported records"
    )


class ImportExecuteRequest(BaseModel):
    file_name: str = Field(..., description="Name of the previously uploaded file")
    column_mapping: Dict[str, str] = Field(
        ..., description="Column header to field name mapping"
    )
    options: ImportOptions = Field(
        default_factory=ImportOptions, description="Import behavior options"
    )


class ImportErrorDetail(BaseModel):
    row: int = Field(..., description="Row number (1-indexed, header = row 1)")
    field: Optional[str] = Field(None, description="Field that caused the error")
    error: str = Field(..., description="Error description")
    data: Optional[Dict[str, str]] = Field(
        None, description="Partial row data for context"
    )


class ImportWarningDetail(BaseModel):
    row: int = Field(..., description="Row number")
    field: Optional[str] = Field(None, description="Field with warning")
    warning: str = Field(..., description="Warning description")
    data: Optional[Dict[str, str]] = Field(
        None, description="Partial row data for context"
    )


class ImportResultResponse(BaseModel):
    batch_id: str = Field(..., description="Unique import batch identifier")
    total_rows: int = Field(..., description="Total rows in the file")
    customers_created: int = Field(0, description="New customer records created")
    customers_updated: int = Field(0, description="Existing customer records updated")
    customers_skipped: int = Field(0, description="Rows skipped (duplicate or invalid)")
    contacts_created: int = Field(0, description="Contact records created")
    notebooks_created: int = Field(0, description="Notebook records auto-created")
    errors: List[ImportErrorDetail] = Field(
        default_factory=list, description="Row-level errors"
    )
    warnings: List[ImportWarningDetail] = Field(
        default_factory=list, description="Row-level warnings"
    )


# CSET Regulations & Questions models
class RegulationResponse(BaseModel):
    id: str
    name: str
    fullName: str
    description: str
    category: str
    sector: str
    sectors: Optional[List[str]] = Field(default_factory=list)
    questionCount: int
    maturityLevels: List[str]


class QuestionResponse(BaseModel):
    id: str
    regulation_id: str
    standard_code: str
    question_text: str
    description: str
    purdue_level: int
    category: str


# Compliance Assessment & Auditing models
class AssessmentCreate(BaseModel):
    customer_id: str = Field(..., description="Customer ID record link")
    framework_id: str = Field(..., description="Framework ID string")
    location_id: Optional[str] = Field(None, description="Location ID record link")


class AssessmentResponse(BaseModel):
    id: str
    customer_id: str
    framework_id: str
    created_at: str
    location_id: Optional[str] = None


class FacilityRollup(BaseModel):
    location_id: Optional[str] = None
    facility_name: str
    session_id: Optional[str] = None
    session_name: Optional[str] = None
    status: str  # "IN_PROGRESS", "COMPLETED", "NOT_STARTED"
    completion_percentage: float
    compliance_score: float
    last_updated: Optional[str] = None


class FrameworkRollup(BaseModel):
    framework_id: str
    framework_name: str
    facilities: List[FacilityRollup]
    average_compliance_score: float
    average_completion_percentage: float
    total_facilities_assessed: int


class CustomerComplianceRollup(BaseModel):
    customer_id: str
    frameworks: List[FrameworkRollup]


class AssessmentSessionCreate(BaseModel):
    session_name: str = Field(..., description="Name of the assessment session")
    carry_forward_prior: Optional[bool] = Field(
        True, description="Clones all answers from previous session if available"
    )


class CategoryCoverage(BaseModel):
    category: str
    total: int
    answered: int
    yes_count: int
    score: float


class ComplianceSnapshot(BaseModel):
    compliance_score: float
    total_questions: int
    answered_count: int
    yes_count: int
    no_count: int
    na_count: int
    alt_count: int
    category_coverage: List[CategoryCoverage]


class AssessmentSessionResponse(BaseModel):
    id: str
    assessment_id: str
    session_name: str
    created_at: str
    completed_at: Optional[str] = None
    status: str  # "IN_PROGRESS" | "COMPLETED"
    version_lock: Optional[str] = None
    compliance_snapshot: Optional[ComplianceSnapshot] = None


class AssessmentAnswerUpdate(BaseModel):
    answer: str = Field(..., description="YES, NO, N/A, ALT answer status")
    comments: Optional[str] = Field("", description="Remediation comments and notes")
    evidence_url: Optional[str] = Field(
        "", description="URL or filepath reference to evidence"
    )


class AssessmentAnswerResponse(BaseModel):
    id: str
    session_id: str
    question_id: str
    answer: str
    comments: str
    evidence_url: str
    updated_at: str


class AssessmentReportStats(BaseModel):
    total_questions: int
    answered_count: int
    yes_count: int
    no_count: int
    na_count: int
    alt_count: int
    completion_percentage: float
    compliance_score: float


class AssessmentReportResponse(BaseModel):
    session_id: str
    session_name: str
    framework_id: str
    stats: AssessmentReportStats
    category_coverage: List[CategoryCoverage]
    prioritized_recommendations: List[Dict[str, Any]]


# Scheduled Search models
class ScheduledSearchCreate(BaseModel):
    name: str = Field(..., description="Name for this scheduled search")
    notebook_id: str = Field(..., description="Notebook ID to save results to")
    query: str = Field(..., description="Search query to execute")
    engine: str = Field(
        "hybrid", description="Search engine: local, perplexity, hybrid"
    )
    interval: str = Field(
        "daily", description="Interval: hourly, daily, weekly, monthly"
    )
    transformation_id: Optional[str] = Field(
        None, description="Optional transformation to apply to results"
    )
    save_as_source: bool = Field(
        True, description="Whether to save results as a source in the notebook"
    )


class ScheduledSearchUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Name for this scheduled search")
    query: Optional[str] = Field(None, description="Search query to execute")
    engine: Optional[str] = Field(None, description="Search engine")
    interval: Optional[str] = Field(
        None, description="Interval: hourly, daily, weekly, monthly"
    )
    is_active: Optional[bool] = Field(
        None, description="Whether this schedule is active"
    )
    transformation_id: Optional[str] = Field(
        None, description="Optional transformation ID"
    )
    save_as_source: Optional[bool] = Field(
        None, description="Whether to save results as source"
    )


class ScheduledSearchResponse(BaseModel):
    id: str
    name: str
    notebook_id: str
    query: str
    engine: str
    interval: str
    is_active: bool
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    run_count: int = 0
    last_error: Optional[str] = None
    transformation_id: Optional[str] = None
    save_as_source: bool = True
    created: str
    updated: str


# ============================================================
# Project Delivery API models
# ============================================================


class ProjectCreate(BaseModel):
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field("", description="Project description")
    customer_id: Optional[str] = Field(None, description="Linked customer ID")
    notebook_id: Optional[str] = Field(None, description="Linked notebook ID")
    stage: Optional[str] = Field("planning", description="Project stage")
    status: Optional[str] = Field("active", description="Project status")
    project_type: Optional[str] = Field("", description="Project type")
    priority: Optional[str] = Field("medium", description="Priority level")
    start_date: Optional[str] = Field(None, description="Start date")
    end_date: Optional[str] = Field(None, description="End date")
    budget: Optional[float] = Field(None, description="Budget amount")
    assigned_to: Optional[str] = Field("", description="Assigned team member")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    customer_id: Optional[str] = Field(None, description="Linked customer ID")
    notebook_id: Optional[str] = Field(None, description="Linked notebook ID")
    stage: Optional[str] = Field(None, description="Project stage")
    status: Optional[str] = Field(None, description="Project status")
    project_type: Optional[str] = Field(None, description="Project type")
    priority: Optional[str] = Field(None, description="Priority level")
    start_date: Optional[str] = Field(None, description="Start date")
    end_date: Optional[str] = Field(None, description="End date")
    budget: Optional[float] = Field(None, description="Budget amount")
    assigned_to: Optional[str] = Field(None, description="Assigned team member")
    tags: Optional[List[str]] = Field(None, description="Tags")
    progress: Optional[int] = Field(None, description="Progress percentage")


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    customer_id: Optional[str] = None
    notebook_id: Optional[str] = None
    stage: Optional[str] = "planning"
    status: Optional[str] = "active"
    project_type: Optional[str] = ""
    priority: Optional[str] = "medium"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budget: Optional[float] = None
    assigned_to: Optional[str] = ""
    tags: Optional[List[str]] = []
    tasks: Optional[List[dict]] = []
    progress: Optional[int] = 0
    created: str
    updated: str


class TaskCreate(BaseModel):
    title: str = Field(..., description="Task title")
    description: Optional[str] = Field("", description="Task description")
    status: Optional[str] = Field("todo", description="todo|in_progress|done")
    priority: Optional[str] = Field("medium", description="Priority level")
    assigned_to: Optional[str] = Field("", description="Assigned to")
    due_date: Optional[str] = Field(None, description="Due date")
    subtasks: Optional[List[dict]] = Field(default_factory=list, description="Subtasks")


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    status: Optional[str] = Field(None, description="Task status")
    priority: Optional[str] = Field(None, description="Priority")
    assigned_to: Optional[str] = Field(None, description="Assigned to")
    due_date: Optional[str] = Field(None, description="Due date")


# ============================================================
# Research Intelligence API models
# ============================================================


class ResearchItemCreate(BaseModel):
    name: str = Field(..., description="Research item name")
    query: str = Field(..., description="Research query text")
    description: Optional[str] = Field("", description="Description")
    customer_id: Optional[str] = Field(None, description="Linked customer ID")
    project_id: Optional[str] = Field(None, description="Linked project ID")
    notebook_id: Optional[str] = Field(None, description="Linked notebook ID")
    transformation_id: Optional[str] = Field(
        None, description="GTM Research template ID"
    )
    stage: Optional[str] = Field("queued", description="Research stage")
    engine: Optional[str] = Field(
        "perplexity", description="Primary search engine (backward compat)"
    )
    engines: Optional[List[str]] = Field(
        default_factory=list, description="Selected search engines"
    )
    formatting_instructions: Optional[str] = Field(
        "", description="LLM output formatting instructions"
    )
    model_id: Optional[str] = Field(None, description="LLM model override")
    interval: Optional[str] = Field(None, description="Recurrence interval")
    is_recurring: Optional[bool] = Field(False, description="Is recurring")
    save_as_source: Optional[bool] = Field(True, description="Save results as source")
    results_content: Optional[str] = Field("", description="Full results markdown content")
    tags: Optional[List[str]] = Field(default_factory=list, description="Tags")
    is_deep_research: Optional[bool] = Field(False, description="Whether to run deep research emulation workflow")
    deep_research_state: Optional[str] = Field("", description="Current deep research step/state")
    deep_research_events: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Deep research execution events log")


class ResearchItemUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Research item name")
    query: Optional[str] = Field(None, description="Research query")
    description: Optional[str] = Field(None, description="Description")
    customer_id: Optional[str] = Field(None, description="Linked customer ID")
    project_id: Optional[str] = Field(None, description="Linked project ID")
    notebook_id: Optional[str] = Field(None, description="Linked notebook ID")
    transformation_id: Optional[str] = Field(
        None, description="GTM Research template ID"
    )
    stage: Optional[str] = Field(None, description="Research stage")
    status: Optional[str] = Field(None, description="Status")
    engine: Optional[str] = Field(None, description="Primary search engine")
    engines: Optional[List[str]] = Field(None, description="Selected search engines")
    formatting_instructions: Optional[str] = Field(
        None, description="LLM output formatting instructions"
    )
    model_id: Optional[str] = Field(None, description="LLM model override")
    interval: Optional[str] = Field(None, description="Recurrence interval")
    is_recurring: Optional[bool] = Field(None, description="Is recurring")
    save_as_source: Optional[bool] = Field(None, description="Save as source")
    tags: Optional[List[str]] = Field(None, description="Tags")
    results_summary: Optional[str] = Field(None, description="Results summary")
    results_content: Optional[str] = Field(None, description="Full results markdown content")
    is_deep_research: Optional[bool] = Field(None, description="Whether to run deep research emulation workflow")
    deep_research_state: Optional[str] = Field(None, description="Current deep research step/state")
    deep_research_events: Optional[List[Dict[str, Any]]] = Field(None, description="Deep research execution events log")


class ResearchItemResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    id: str
    name: str
    query: str
    description: Optional[str] = ""
    customer_id: Optional[str] = None
    project_id: Optional[str] = None
    notebook_id: Optional[str] = None
    transformation_id: Optional[str] = None
    stage: Optional[str] = "queued"
    status: Optional[str] = "active"
    engine: Optional[str] = "perplexity"
    engines: Optional[List[str]] = []
    formatting_instructions: Optional[str] = ""
    model_id: Optional[str] = None
    interval: Optional[str] = None
    is_recurring: Optional[bool] = False
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    run_count: Optional[int] = 0
    last_error: Optional[str] = None
    results_summary: Optional[str] = ""
    results_content: Optional[str] = ""
    save_as_source: Optional[bool] = True
    tags: Optional[List[str]] = []
    created: str
    updated: str
    is_deep_research: Optional[bool] = False
    deep_research_state: Optional[str] = ""
    deep_research_events: Optional[List[Dict[str, Any]]] = []


class LinkRequest(BaseModel):
    """Generic request for creating links between entities."""

    target_id: str = Field(..., description="Target entity ID to link to")


# Style Guide models
class StyleGuideCreate(BaseModel):
    name: str = Field(..., description="Style guide name")
    description: Optional[str] = Field("", description="Description")
    guide_type: Optional[str] = Field(
        "report", description="report, landing_page, two_pager, memo"
    )
    title_font: Optional[str] = Field("Inter")
    body_font: Optional[str] = Field("Inter")
    title_size: Optional[str] = Field("24pt")
    heading_size: Optional[str] = Field("18pt")
    subheading_size: Optional[str] = Field("14pt")
    body_size: Optional[str] = Field("11pt")
    line_spacing: Optional[str] = Field("1.5")
    logo_url: Optional[str] = Field("")
    strapline: Optional[str] = Field("")
    primary_color: Optional[str] = Field("#1a73e8")
    secondary_color: Optional[str] = Field("#34a853")
    accent_color: Optional[str] = Field("#fbbc04")
    page_size: Optional[str] = Field("letter")
    page_orientation: Optional[str] = Field("portrait")
    margin_top: Optional[str] = Field("1in")
    margin_bottom: Optional[str] = Field("1in")
    margin_left: Optional[str] = Field("1in")
    margin_right: Optional[str] = Field("1in")
    heading_style: Optional[str] = Field("bold")
    color_scheme: Optional[str] = Field("dark")
    include_toc: Optional[bool] = Field(True)
    include_page_numbers: Optional[bool] = Field(True)


class StyleGuideUpdate(StyleGuideCreate):
    pass


class StyleGuideResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    guide_type: Optional[str] = "report"
    title_font: Optional[str] = "Inter"
    body_font: Optional[str] = "Inter"
    title_size: Optional[str] = "24pt"
    heading_size: Optional[str] = "18pt"
    subheading_size: Optional[str] = "14pt"
    body_size: Optional[str] = "11pt"
    line_spacing: Optional[str] = "1.5"
    logo_url: Optional[str] = ""
    strapline: Optional[str] = ""
    primary_color: Optional[str] = "#1a73e8"
    secondary_color: Optional[str] = "#34a853"
    accent_color: Optional[str] = "#fbbc04"
    page_size: Optional[str] = "letter"
    page_orientation: Optional[str] = "portrait"
    margin_top: Optional[str] = "1in"
    margin_bottom: Optional[str] = "1in"
    margin_left: Optional[str] = "1in"
    margin_right: Optional[str] = "1in"
    heading_style: Optional[str] = "bold"
    color_scheme: Optional[str] = "dark"
    include_toc: Optional[bool] = True
    include_page_numbers: Optional[bool] = True
    created: Optional[str] = None
    updated: Optional[str] = None


# Layer 1 Agent Framework models
class AgentConfigCreate(BaseModel):
    name: str = Field(..., description="Unique name of the agent")
    description: str = Field(..., description="Description of the agent's function")
    type: Literal["researcher", "coder", "analyst", "orchestrator"] = Field(
        ..., description="Agent archetype type"
    )
    default_model: str = Field(
        ..., description="Default LLM model to be used by the agent"
    )
    system_prompt: str = Field(..., description="Main system instructions and prompts")
    allowed_tools: List[str] = Field(
        default_factory=list, description="List of authorized skills and MCP tools"
    )
    tenant_id: str = Field(..., description="Tenant workspace isolation identifier")


class AgentConfigUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Unique name of the agent")
    description: Optional[str] = Field(
        None, description="Description of the agent's function"
    )
    type: Optional[Literal["researcher", "coder", "analyst", "orchestrator"]] = Field(
        None, description="Agent archetype type"
    )
    default_model: Optional[str] = Field(
        None, description="Default LLM model to be used by the agent"
    )
    system_prompt: Optional[str] = Field(
        None, description="Main system instructions and prompts"
    )
    allowed_tools: Optional[List[str]] = Field(
        None, description="List of authorized skills and MCP tools"
    )
    tenant_id: Optional[str] = Field(
        None, description="Tenant workspace isolation identifier"
    )


class AgentConfigResponse(BaseModel):
    id: str
    name: str
    description: str
    type: Literal["researcher", "coder", "analyst", "orchestrator"]
    default_model: str
    system_prompt: str
    allowed_tools: List[str]
    tenant_id: str
    created: str
    updated: str


class AgentExecutionResponse(BaseModel):
    id: str
    agent_config_id: str
    status: Literal["queued", "running", "completed", "failed", "paused"]
    input_params: Dict[str, Any]
    output_results: Dict[str, Any]
    started_at: str
    completed_at: Optional[str] = None


class AgentLogResponse(BaseModel):
    id: str
    execution_id: str
    step_name: str
    tool_call: Optional[str] = None
    tool_input: Optional[Dict[str, Any]] = None
    tool_output: Optional[Dict[str, Any]] = None
    trace_level: Literal["info", "debug", "error"]
    created: str


# Layer 2 Skill Registry models
class SkillRegistryCreate(BaseModel):
    name: str = Field(..., description="Unique technical name of the skill")
    description: str = Field(..., description="Description of the skill's function")
    category: str = Field(..., description="Categorization of the skill")
    enabled: Optional[bool] = Field(True, description="Enable or disable state")
    config_vars: Dict[str, Any] = Field(
        default_factory=dict, description="Configuration variables"
    )


class SkillRegistryUpdate(BaseModel):
    description: Optional[str] = Field(
        None, description="Description of the skill's function"
    )
    category: Optional[str] = Field(None, description="Categorization of the skill")
    enabled: Optional[bool] = Field(None, description="Enable or disable state")
    config_vars: Optional[Dict[str, Any]] = Field(
        None, description="Configuration variables"
    )


class SkillRegistryResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    enabled: bool
    config_vars: Dict[str, Any]
    created: str
    updated: str  # Layer 1 Agent Prompt and Run Pipeline models


class AgentPromptCreate(BaseModel):
    notebook_id: str = Field(..., description="Dossier/Notebook database identifier")
    agent_name: str = Field(..., description="Task/Agent config unique identifier")
    prompt_text: str = Field(..., description="System prompt template text override")


class AgentPromptResponse(BaseModel):
    id: str
    notebook_id: str
    agent_name: str
    prompt_text: str
    created: str
    updated: str


class AgentRunPipelineRequest(BaseModel):
    notebookId: str
    sowContent: str
    topology: Dict[str, Any]
    agentConfigs: List[Dict[str, Any]]
    customPrompts: Optional[Dict[str, str]] = None


class AgentRunStepLog(BaseModel):
    id: int
    name: str
    status: str
    model: str
    latency: int
    tokens: int
    timestamp: str
    output: Optional[str] = None


class AgentRunPipelineResponse(BaseModel):
    success: bool
    steps: List[AgentRunStepLog]
    objections: List[Dict[str, Any]]
    cost: float


class DraftCopilotRequest(BaseModel):
    notebook_id: Optional[str] = Field(
        None, description="Notebook ID to load custom prompts"
    )
    text: str = Field(..., description="Text selection or content from SOW editor")
    action: str = Field(
        ..., description="Action to perform: 'expand', 'rewrite', or 'autocomplete'"
    )


class DraftCopilotResponse(BaseModel):
    suggestion: str = Field(..., description="AI generated suggestion text")


# Scheduled Episode models for Podcast Automation
class ScheduledEpisodeCreate(BaseModel):
    notebook_id: str = Field(..., description="ID of the notebook/dossier")
    name: str = Field(..., description="Name of the automated episode")
    episode_profile: str = Field(..., description="Name of the episode profile to use")
    speaker_profile: str = Field(..., description="Name of the speaker profile to use")
    schedule: str = Field(..., description="Cron expression or timing configuration")
    status: Literal["active", "paused", "completed", "failed"] = Field("active", description="Current schedule status")


class ScheduledEpisodeUpdate(BaseModel):
    status: Optional[Literal["active", "paused", "completed", "failed"]] = Field(None, description="Status update")


class ScheduledEpisodeResponse(BaseModel):
    id: str
    notebook: str
    name: str
    episode_profile: str
    speaker_profile: str
    schedule: str
    status: str
    last_run: Optional[str] = None
    next_run: Optional[str] = None
    created: str
    updated: str


# Publication/Social Scheduler models
class EmailSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: Optional[bool] = True
    oauth_provider: Optional[str] = None
    oauth_token_ref: Optional[str] = None


class EmailSettingsResponse(BaseModel):
    id: str
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: Optional[bool] = True
    oauth_provider: Optional[str] = None
    oauth_token_ref: Optional[str] = None
    created: str
    updated: str


class ScheduledPostCreate(BaseModel):
    channel: Literal["linkedin", "twitter", "email"]
    title: str
    content: str
    media_urls: Optional[List[str]] = None
    scheduled_time: str
    status: Literal["draft", "queued", "published", "failed"] = "draft"


class ScheduledPostUpdate(BaseModel):
    channel: Optional[Literal["linkedin", "twitter", "email"]] = None
    title: Optional[str] = None
    content: Optional[str] = None
    media_urls: Optional[List[str]] = None
    scheduled_time: Optional[str] = None
    status: Optional[Literal["draft", "queued", "published", "failed"]] = None


class ScheduledPostResponse(BaseModel):
    id: str
    channel: str
    title: str
    content: str
    media_urls: List[str]
    scheduled_time: str
    status: str
    error_message: Optional[str] = None
    views: int = 0
    clicks: int = 0
    interactions: int = 0
    created: str
    updated: str


