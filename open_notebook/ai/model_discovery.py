"""
Model Discovery - Automatic model fetching from AI providers.

This module provides functionality to discover available models from configured
AI providers and automatically register them in the database.
"""

import asyncio
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx
from loguru import logger

from open_notebook.ai.models import Model
from open_notebook.database.repository import repo_query
from open_notebook.domain.credential import Credential


@dataclass
class DiscoveredModel:
    """Represents a model discovered from a provider."""

    name: str
    provider: str
    model_type: str  # language, embedding, reranking, image_generation, audio, video, ...
    description: Optional[str] = None
    context_length: Optional[int] = None
    max_completion_tokens: Optional[int] = None
    pricing_prompt: Optional[str] = None
    pricing_completion: Optional[str] = None
    modality: Optional[str] = None  # e.g. "text->text", "text+image->text+image"
    input_modalities: Optional[List[str]] = None
    output_modalities: Optional[List[str]] = None
    # Full pricing breakdown
    pricing_image: Optional[str] = None
    pricing_audio: Optional[str] = None
    pricing_web_search: Optional[str] = None
    pricing_internal_reasoning: Optional[str] = None
    pricing_input_cache_read: Optional[str] = None
    pricing_input_cache_write: Optional[str] = None
    # Architecture
    tokenizer: Optional[str] = None
    instruct_type: Optional[str] = None
    # Metadata
    hugging_face_id: Optional[str] = None
    canonical_slug: Optional[str] = None
    knowledge_cutoff: Optional[str] = None
    expiration_date: Optional[str] = None
    supported_parameters: Optional[List[str]] = None
    is_moderated: Optional[bool] = None
    # Provider-level context
    provider_context_length: Optional[int] = None
    # Sync tracking
    openrouter_created_at: Optional[int] = None


# =============================================================================
# Provider-Specific Model Type Classification
# =============================================================================
# These mappings help classify models by their capabilities based on naming patterns

OPENAI_MODEL_TYPES = {
    "language": [
        "gpt-4",
        "gpt-3.5",
        "o1",
        "o3",
        "chatgpt",
        "text-davinci",
        "davinci",
        "curie",
        "babbage",
        "ada",
    ],
    "embedding": ["text-embedding", "embedding"],
    "speech_to_text": ["whisper"],
    "text_to_speech": ["tts"],
}

ANTHROPIC_MODELS = {
    # Static list since Anthropic doesn't have a model listing API
    "language": [
        "claude-opus-4-20250514",
        "claude-sonnet-4-20250514",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
    ],
}

GOOGLE_MODEL_TYPES = {
    "language": ["gemini", "palm", "bison", "chat"],
    "embedding": ["embedding", "textembedding"],
}

OLLAMA_MODEL_TYPES = {
    # Ollama models can do multiple things, classify by common names
    # NOTE: embedding patterns are checked BEFORE language patterns in classify_model_type,
    # so "qwen3-embedding" correctly matches embedding before "qwen" matches language.
    "language": [
        "llama",
        "mistral",
        "mixtral",
        "codellama",
        "phi",
        "gemma",
        "qwen",
        "deepseek",
        "vicuna",
        "falcon",
        "orca",
        "neural",
        "dolphin",
        "openchat",
        "starling",
        "solar",
        "yi",
        "nous",
        "wizard",
        "zephyr",
        "tinyllama",
    ],
    "embedding": [
        "nomic-embed",
        "mxbai-embed",
        "all-minilm",
        "bge-",
        "e5-",
        "snowflake-arctic-embed",
        "qwen3-embedding",
        "embedding",
        "embed",
    ],
    "reranking": [
        "rerank",
        "reranker",
    ],
}

OPENROUTER_MODEL_TYPES = {
    # OpenRouter hosts many providers; classify by model name patterns
    "reranking": [
        "rerank",
        "reranker",
    ],
    "embedding": [
        "embedding",
        "embed",
        "text-embedding",
        "nomic-embed",
        "bge-",
        "e5-",
        "voyage",
        "jina-embeddings",
    ],
    "image_generation": [
        "image",
        "flux",
        "recraft",
        "grok-imagine",
    ],
    "audio": [
        "audio",
        "lyria",
        "clip-preview",
        "pro-preview",
    ],
    "video": [
        "video",
        "hailuo",
        "wan-",
    ],
    "speech_to_text": ["whisper"],
    "language": [],  # everything else defaults to language
}

MISTRAL_MODEL_TYPES = {
    "language": [
        "mistral",
        "mixtral",
        "codestral",
        "ministral",
        "pixtral",
        "open-mistral",
        "open-mixtral",
    ],
    "embedding": ["mistral-embed"],
}

GROQ_MODEL_TYPES = {
    "language": ["llama", "mixtral", "gemma", "whisper"],
    "speech_to_text": ["whisper"],
}

DEEPSEEK_MODEL_TYPES = {
    "language": ["deepseek-chat", "deepseek-reasoner", "deepseek-coder"],
}

XAI_MODEL_TYPES = {
    "language": ["grok"],
}

VOYAGE_MODEL_TYPES = {
    "embedding": ["voyage"],
}

ELEVENLABS_MODEL_TYPES = {
    "text_to_speech": ["eleven"],
}

DASHSCOPE_MODEL_TYPES = {
    "language": ["qwen"],
}

MINIMAX_MODEL_TYPES = {
    "language": ["minimax", "abab"],
}

DEEPGRAM_MODEL_TYPES = {
    "speech_to_text": ["nova"],
    "text_to_speech": ["aura"],
}


def classify_model_type(model_name: str, provider: str) -> str:
    """
    Classify a model into a type based on its name and provider.

    Returns one of: language, embedding, speech_to_text, text_to_speech
    """
    name_lower = model_name.lower()

    type_mappings = {
        "openai": OPENAI_MODEL_TYPES,
        "google": GOOGLE_MODEL_TYPES,
        "ollama": OLLAMA_MODEL_TYPES,
        "openrouter": OPENROUTER_MODEL_TYPES,
        "mistral": MISTRAL_MODEL_TYPES,
        "groq": GROQ_MODEL_TYPES,
        "deepseek": DEEPSEEK_MODEL_TYPES,
        "xai": XAI_MODEL_TYPES,
        "voyage": VOYAGE_MODEL_TYPES,
        "elevenlabs": ELEVENLABS_MODEL_TYPES,
        "deepgram": DEEPGRAM_MODEL_TYPES,
        "dashscope": DASHSCOPE_MODEL_TYPES,
        "minimax": MINIMAX_MODEL_TYPES,
    }

    mapping = type_mappings.get(provider, {})

    # Check each type in order of specificity
    for model_type in ["speech_to_text", "text_to_speech", "reranking", "embedding", "language"]:
        patterns = mapping.get(model_type, [])
        for pattern in patterns:
            if pattern in name_lower:
                return model_type

    # Default to language for unknown models
    return "language"


# =============================================================================
# Provider-Specific Model Discovery Functions
# =============================================================================


async def discover_openai_models() -> List[DiscoveredModel]:
    """Fetch available models from OpenAI API."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if model_id:
                    model_type = classify_model_type(model_id, "openai")
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="openai",
                            model_type=model_type,
                        )
                    )
    except Exception as e:
        logger.warning(f"Failed to discover OpenAI models: {e}")

    return models


async def discover_anthropic_models() -> List[DiscoveredModel]:
    """Return static list of Anthropic models (no discovery API available)."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return []

    # Anthropic doesn't have a model listing API, so we use a static list
    models = []
    for model_name in ANTHROPIC_MODELS.get("language", []):
        models.append(
            DiscoveredModel(
                name=model_name,
                provider="anthropic",
                model_type="language",
            )
        )
    return models


async def discover_google_models() -> List[DiscoveredModel]:
    """Fetch available models from Google Gemini API."""
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            # Build URL without logging the key to avoid exposure
            url = "https://generativelanguage.googleapis.com/v1/models"
            headers = {"X-Goog-Api-Key": api_key}
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            data = response.json()

            for model in data.get("models", []):
                # Google returns full path like "models/gemini-1.5-flash"
                model_name = model.get("name", "").replace("models/", "")
                if model_name:
                    model_type = classify_model_type(model_name, "google")
                    # Check supported generation methods for better classification
                    methods = model.get("supportedGenerationMethods", [])
                    if "embedContent" in methods:
                        model_type = "embedding"
                    elif "generateContent" in methods:
                        model_type = "language"

                    models.append(
                        DiscoveredModel(
                            name=model_name,
                            provider="google",
                            model_type=model_type,
                            description=model.get("displayName"),
                        )
                    )
    except Exception as e:
        # Log without exposing the API key in the message
        logger.warning(f"Failed to discover Google models: {type(e).__name__}")

    return models


async def discover_ollama_models() -> List[DiscoveredModel]:
    """Fetch available models from local Ollama instance."""
    base_url = os.environ.get("OLLAMA_API_BASE", "http://localhost:11434")
    if not base_url:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{base_url}/api/tags",
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("models", []):
                model_name = model.get("name", "")
                if model_name:
                    model_type = classify_model_type(model_name, "ollama")
                    models.append(
                        DiscoveredModel(
                            name=model_name,
                            provider="ollama",
                            model_type=model_type,
                        )
                    )
    except Exception as e:
        logger.warning(f"Failed to discover Ollama models: {e}")

    # Ensure local Qwen3 reranker is always present in the list
    existing_names = {m.name for m in models}
    if "dengcao/Qwen3-Reranker-4B:Q4_K_M" not in existing_names:
        models.append(
            DiscoveredModel(
                name="dengcao/Qwen3-Reranker-4B:Q4_K_M",
                provider="ollama",
                model_type="reranking",
                description="Qwen3 Reranker 4B (Local)"
            )
        )

    return models


async def discover_groq_models() -> List[DiscoveredModel]:
    """Fetch available models from Groq API."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if model_id:
                    model_type = classify_model_type(model_id, "groq")
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="groq",
                            model_type=model_type,
                        )
                    )
    except Exception as e:
        logger.warning(f"Failed to discover Groq models: {e}")

    return models


async def discover_mistral_models() -> List[DiscoveredModel]:
    """Fetch available models from Mistral API."""
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.mistral.ai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if model_id:
                    model_type = classify_model_type(model_id, "mistral")
                    # Check capabilities if available
                    capabilities = model.get("capabilities", {})
                    if capabilities.get("completion_chat"):
                        model_type = "language"

                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="mistral",
                            model_type=model_type,
                        )
                    )
    except Exception as e:
        logger.warning(f"Failed to discover Mistral models: {e}")

    return models


async def discover_deepseek_models() -> List[DiscoveredModel]:
    """Fetch available models from DeepSeek API."""
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.deepseek.com/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if model_id:
                    model_type = classify_model_type(model_id, "deepseek")
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="deepseek",
                            model_type=model_type,
                        )
                    )
    except Exception as e:
        logger.warning(f"Failed to discover DeepSeek models: {e}")

    return models


async def discover_xai_models() -> List[DiscoveredModel]:
    """Fetch available models from xAI API."""
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.x.ai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if model_id:
                    model_type = classify_model_type(model_id, "xai")
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="xai",
                            model_type=model_type,
                        )
                    )
    except Exception as e:
        logger.warning(f"Failed to discover xAI models: {e}")

    return models


def classify_openrouter_by_modality(model_id: str, architecture: dict) -> str:
    """
    Classify an OpenRouter model using its output modalities first,
    then falling back to name-based pattern matching.
    """
    output_mods = architecture.get("output_modalities", [])
    input_mods = architecture.get("input_modalities", [])

    # Output-modality-based classification (most specific first)
    if "video" in output_mods:
        return "video"
    if "image" in output_mods and "text" in output_mods:
        return "image_generation"
    if "image" in output_mods:
        return "image_generation"
    if "audio" in output_mods:
        return "audio"

    # Name-based classification for reranking/embedding
    name_lower = model_id.lower()
    if any(pat in name_lower for pat in ["video", "hailuo", "wan-"]):
        return "video"
    if any(pat in name_lower for pat in ["audio", "lyria", "clip-preview", "pro-preview"]):
        return "audio"
    if any(pat in name_lower for pat in ["image", "flux", "recraft", "grok-imagine"]):
        return "image_generation"
    for pattern in ["rerank", "reranker"]:
        if pattern in name_lower:
            return "reranking"
    for pattern in ["embedding", "embed", "text-embedding", "nomic-embed",
                     "bge-", "e5-", "voyage", "jina-embeddings"]:
        if pattern in name_lower:
            return "embedding"

    # Default: language (covers text->text and all multimodal-input text-output)
    return "language"


async def discover_openrouter_models() -> List[DiscoveredModel]:
    """Fetch available models from OpenRouter API with ALL attributes."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        required_openrouter_models = [
            # Embedding
            ("qwen/qwen3-embedding-8b", "embedding", "Qwen 3 Embedding 8B"),
            ("openai/text-embedding-3-small", "embedding", "OpenAI Text Embedding 3 Small"),
            ("openai/text-embedding-3-large", "embedding", "OpenAI Text Embedding 3 Large"),
            # Audio
            ("google/lyria-3-clip-preview", "audio", "Google Lyria 3 Clip Preview"),
            ("google/lyria-3-pro-preview", "audio", "Google Lyria 3 Pro Preview"),
            # Image
            ("black-forest-labs/flux.2-max", "image_generation", "FLUX.2 Max"),
            ("recraft/recraft-v4-vector", "image_generation", "Recraft v4 Vector"),
            ("x-ai/grok-imagine-image-quality", "image_generation", "Grok Imagine Image Quality"),
            # Video
            ("x-ai/grok-imagine-video", "video", "Grok Imagine Video"),
            ("minimax/hailuo-2.3", "video", "MiniMax Hailuo 2.3"),
            ("alibaba/wan-2.6", "video", "Alibaba Wan 2.6"),
        ]
        return [
            DiscoveredModel(
                name=name,
                provider="openrouter",
                model_type=model_type,
                description=desc,
                input_modalities=["text"],
                output_modalities=[model_type.replace("image_generation", "image")]
            )
            for name, model_type, desc in required_openrouter_models
        ]

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if not model_id:
                    continue

                # Architecture
                architecture = model.get("architecture", {})
                modality_str = architecture.get("modality", "")
                input_mods = architecture.get("input_modalities", [])
                output_mods = architecture.get("output_modalities", [])
                tokenizer = architecture.get("tokenizer")
                instruct_type = architecture.get("instruct_type")

                # Classify using modality + name patterns
                model_type = classify_openrouter_by_modality(model_id, architecture)

                # Full pricing breakdown
                pricing = model.get("pricing", {})

                # Context/completion limits
                context_length = model.get("context_length")
                top_provider = model.get("top_provider", {}) or {}
                max_completion_tokens = top_provider.get("max_completion_tokens")
                is_moderated = top_provider.get("is_moderated")
                provider_ctx = top_provider.get("context_length")

                models.append(
                    DiscoveredModel(
                        name=model_id,
                        provider="openrouter",
                        model_type=model_type,
                        description=model.get("name"),
                        context_length=context_length,
                        max_completion_tokens=max_completion_tokens,
                        # Core pricing
                        pricing_prompt=pricing.get("prompt"),
                        pricing_completion=pricing.get("completion"),
                        # Extended pricing
                        pricing_image=pricing.get("image"),
                        pricing_audio=pricing.get("audio"),
                        pricing_web_search=pricing.get("web_search"),
                        pricing_internal_reasoning=pricing.get("internal_reasoning"),
                        pricing_input_cache_read=pricing.get("input_cache_read"),
                        pricing_input_cache_write=pricing.get("input_cache_write"),
                        # Modality
                        modality=modality_str,
                        input_modalities=input_mods if input_mods else None,
                        output_modalities=output_mods if output_mods else None,
                        # Architecture
                        tokenizer=tokenizer,
                        instruct_type=instruct_type,
                        # Metadata
                        hugging_face_id=model.get("hugging_face_id"),
                        canonical_slug=model.get("canonical_slug"),
                        knowledge_cutoff=model.get("knowledge_cutoff"),
                        expiration_date=model.get("expiration_date"),
                        supported_parameters=model.get("supported_parameters"),
                        is_moderated=is_moderated,
                        # Provider context
                        provider_context_length=provider_ctx,
                        # Sync tracking
                        openrouter_created_at=model.get("created"),
                    )
                )
    except Exception as e:
        logger.warning(f"Failed to discover OpenRouter models: {e}")

    # Ensure required OpenRouter models are always present
    required_openrouter_models = [
        # Embedding
        ("qwen/qwen3-embedding-8b", "embedding", "Qwen 3 Embedding 8B"),
        ("openai/text-embedding-3-small", "embedding", "OpenAI Text Embedding 3 Small"),
        ("openai/text-embedding-3-large", "embedding", "OpenAI Text Embedding 3 Large"),
        # Audio
        ("google/lyria-3-clip-preview", "audio", "Google Lyria 3 Clip Preview"),
        ("google/lyria-3-pro-preview", "audio", "Google Lyria 3 Pro Preview"),
        # Image
        ("black-forest-labs/flux.2-max", "image_generation", "FLUX.2 Max"),
        ("recraft/recraft-v4-vector", "image_generation", "Recraft v4 Vector"),
        ("x-ai/grok-imagine-image-quality", "image_generation", "Grok Imagine Image Quality"),
        # Video
        ("x-ai/grok-imagine-video", "video", "Grok Imagine Video"),
        ("minimax/hailuo-2.3", "video", "MiniMax Hailuo 2.3"),
        ("alibaba/wan-2.6", "video", "Alibaba Wan 2.6"),
    ]
    existing_names = {m.name for m in models}
    for name, model_type, desc in required_openrouter_models:
        if name not in existing_names:
            models.append(
                DiscoveredModel(
                    name=name,
                    provider="openrouter",
                    model_type=model_type,
                    description=desc,
                    input_modalities=["text"],
                    output_modalities=[model_type.replace("image_generation", "image")]
                )
            )

    return models


async def discover_voyage_models() -> List[DiscoveredModel]:
    """Return static list of Voyage AI models (embedding only)."""
    api_key = os.environ.get("VOYAGE_API_KEY")
    if not api_key:
        return []

    # Voyage AI specializes in embeddings
    voyage_models = [
        "voyage-3",
        "voyage-3-lite",
        "voyage-code-3",
        "voyage-finance-2",
        "voyage-law-2",
        "voyage-multilingual-2",
    ]

    return [
        DiscoveredModel(name=m, provider="voyage", model_type="embedding")
        for m in voyage_models
    ]


async def discover_elevenlabs_models() -> List[DiscoveredModel]:
    """Return static list of ElevenLabs TTS models."""
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        return []

    # ElevenLabs specializes in TTS
    elevenlabs_models = [
        "eleven_multilingual_v2",
        "eleven_turbo_v2_5",
        "eleven_turbo_v2",
        "eleven_monolingual_v1",
        "eleven_multilingual_v1",
    ]

    return [
        DiscoveredModel(name=m, provider="elevenlabs", model_type="text_to_speech")
        for m in elevenlabs_models
    ]


async def discover_deepgram_models() -> List[DiscoveredModel]:
    """Discover available Deepgram STT and TTS models via the /v1/models API."""
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    if not api_key:
        return []

    models: List[DiscoveredModel] = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.deepgram.com/v1/models",
                headers={"Authorization": f"Token {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            # STT models
            for model in data.get("stt", []):
                model_id = model.get("canonical_name") or model.get("name", "")
                if model_id:
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="deepgram",
                            model_type="speech_to_text",
                            description=model.get("name", model_id),
                        )
                    )

            # TTS models
            for model in data.get("tts", []):
                model_id = model.get("canonical_name") or model.get("name", "")
                if model_id:
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="deepgram",
                            model_type="text_to_speech",
                            description=model.get("name", model_id),
                        )
                    )

            if models:
                logger.info(f"Discovered {len(models)} Deepgram models via API")
                return models
    except Exception as e:
        logger.warning(f"Failed to discover Deepgram models from API: {e}")

    # Fallback: static list of well-known models
    stt_models = ["nova-3", "nova-2", "nova-2-general", "nova-2-meeting", "nova-2-phonecall"]
    tts_models = [
        "aura-2-thalia-en", "aura-2-andromeda-en", "aura-2-arcas-en",
        "aura-2-helios-en", "aura-2-luna-en", "aura-2-orion-en",
        "aura-2-perseus-en", "aura-2-stella-en",
    ]

    for m in stt_models:
        models.append(
            DiscoveredModel(
                name=m, provider="deepgram", model_type="speech_to_text",
                description=f"Deepgram {m.replace('-', ' ').title()}",
            )
        )
    for m in tts_models:
        models.append(
            DiscoveredModel(
                name=m, provider="deepgram", model_type="text_to_speech",
                description=f"Deepgram Aura-2 voice: {m.split('-')[2].title()}",
            )
        )

    logger.info(f"Using {len(models)} fallback Deepgram models")
    return models


async def discover_kokoro_models() -> List[DiscoveredModel]:
    """Discover Kokoro TTS voices from the local service."""
    kokoro_url = os.environ.get("KOKORO_TTS_URL", "http://kokoro-tts:8880")

    # Hardcoded fallback voices matching api/routers/voice.py KOKORO_VOICES
    KOKORO_FALLBACK = [
        "af_heart", "af_bella", "af_nicole", "af_sarah", "af_sky",
        "am_adam", "am_michael",
        "bf_emma", "bf_isabella",
        "bm_george", "bm_lewis",
    ]

    models: List[DiscoveredModel] = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{kokoro_url}/v1/audio/voices")
            if resp.status_code == 200:
                data = resp.json()
                voices = data.get("voices", data) if isinstance(data, dict) else data
                for v in voices:
                    voice_id = v.get("id", v) if isinstance(v, dict) else str(v)
                    voice_name = v.get("name", voice_id) if isinstance(v, dict) else str(v)
                    models.append(
                        DiscoveredModel(
                            name=voice_id,
                            provider="kokoro",
                            model_type="text_to_speech",
                            description=f"Kokoro TTS voice: {voice_name}",
                        )
                    )
                if models:
                    return models
    except Exception as e:
        logger.warning(f"Failed to discover Kokoro models from service: {e}")

    # Fallback: register hardcoded voice list (always available)
    for v in KOKORO_FALLBACK:
        models.append(
            DiscoveredModel(
                name=v,
                provider="kokoro",
                model_type="text_to_speech",
                description=f"Kokoro TTS voice: {v.replace('_', ' ').title()}",
            )
        )
    return models


async def discover_dashscope_models() -> List[DiscoveredModel]:
    """Fetch available models from DashScope (Qwen) API."""
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if model_id:
                    model_type = classify_model_type(model_id, "dashscope")
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="dashscope",
                            model_type=model_type,
                        )
                    )
    except Exception as e:
        logger.warning(f"Failed to discover DashScope models: {e}")

    return models


async def discover_minimax_models() -> List[DiscoveredModel]:
    """Fetch available models from MiniMax API."""
    api_key = os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.minimax.io/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if model_id:
                    model_type = classify_model_type(model_id, "minimax")
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="minimax",
                            model_type=model_type,
                        )
                    )
    except Exception as e:
        logger.warning(f"Failed to discover MiniMax models: {e}")

    return models


async def discover_openai_compatible_models() -> List[DiscoveredModel]:
    """
    Fetch available models from an OpenAI-compatible API endpoint.
    Uses the configured base_url from the database or environment variable.
    """
    api_key = None
    base_url = None

    # Try to get config from Credential database first
    try:
        credentials = await Credential.get_by_provider("openai_compatible")
        if credentials:
            cred = credentials[0]
            config = cred.to_esperanto_config()
            api_key = config.get("api_key")
            base_url = config.get("base_url", "").rstrip("/")
    except Exception as e:
        logger.warning(f"Failed to read openai_compatible config from Credential: {e}")

    # Fall back to environment variables
    if not api_key:
        api_key = os.environ.get("OPENAI_COMPATIBLE_API_KEY")
    if not base_url:
        base_url = os.environ.get("OPENAI_COMPATIBLE_BASE_URL", "").rstrip("/")

    if not base_url:
        logger.warning("No base_url configured for openai_compatible provider")
        return []

    models = []
    try:
        async with httpx.AsyncClient() as client:
            headers = {}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            response = await client.get(
                f"{base_url}/models",
                headers=headers,
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()

            for model in data.get("data", []):
                model_id = model.get("id", "")
                if model_id:
                    # Classify based on model name patterns
                    model_type = classify_model_type(model_id, "openai")
                    models.append(
                        DiscoveredModel(
                            name=model_id,
                            provider="openai_compatible",
                            model_type=model_type,
                        )
                    )
    except httpx.HTTPStatusError as e:
        logger.warning(f"Failed to discover openai_compatible models: HTTP {e.response.status_code}")
    except Exception as e:
        logger.warning(f"Failed to discover openai_compatible models: {e}")

    return models


# =============================================================================
# Main Discovery Functions
# =============================================================================

# Map provider names to their discovery functions
PROVIDER_DISCOVERY_FUNCTIONS = {
    "openai": discover_openai_models,
    "anthropic": discover_anthropic_models,
    "google": discover_google_models,
    "ollama": discover_ollama_models,
    "groq": discover_groq_models,
    "mistral": discover_mistral_models,
    "deepseek": discover_deepseek_models,
    "xai": discover_xai_models,
    "openrouter": discover_openrouter_models,
    "voyage": discover_voyage_models,
    "elevenlabs": discover_elevenlabs_models,
    "kokoro": discover_kokoro_models,
    "deepgram": discover_deepgram_models,
    "openai_compatible": discover_openai_compatible_models,
    "dashscope": discover_dashscope_models,
    "minimax": discover_minimax_models,
    "azure": None,  # Azure requires credential-based discovery (different auth)
    "vertex": None,  # Vertex requires credential-based discovery (service account)
}


async def discover_provider_models(provider: str) -> List[DiscoveredModel]:
    """
    Discover available models for a specific provider.

    Args:
        provider: Provider name (openai, anthropic, etc.)

    Returns:
        List of discovered models
    """
    discover_func = PROVIDER_DISCOVERY_FUNCTIONS.get(provider)
    if discover_func is None:
        if provider in PROVIDER_DISCOVERY_FUNCTIONS:
            logger.info(
                f"Provider '{provider}' requires credential-based discovery. "
                f"Use the /credentials/{{id}}/discover endpoint instead."
            )
        else:
            logger.warning(f"No discovery function for provider: {provider}")
        return []

    return await discover_func()


async def sync_provider_models(
    provider: str, auto_register: bool = True
) -> Tuple[int, int, int]:
    """
    Sync models for a provider: discover and optionally register in database.

    Args:
        provider: Provider name
        auto_register: If True, automatically create Model records in database

    Returns:
        Tuple of (discovered_count, new_count, existing_count)
    """
    discovered = await discover_provider_models(provider)
    discovered_count = len(discovered)
    new_count = 0
    existing_count = 0
    updated_count = 0

    if not auto_register:
        return discovered_count, 0, 0

    if not discovered:
        return 0, 0, 0

    # Batch fetch existing models (with IDs) to support upsert
    existing_by_name: Dict[str, dict] = {}
    try:
        existing_models = await repo_query(
            "SELECT * FROM model "
            "WHERE string::lowercase(provider) = $provider",
            {"provider": provider.lower()},
        )
        for m in existing_models:
            key = m.get("name", "").lower()
            existing_by_name[key] = m
    except Exception as e:
        logger.warning(f"Failed to fetch existing models for {provider}: {e}")

    now_iso = datetime.now(timezone.utc).isoformat()

    for model in discovered:
        name_key = model.name.lower()
        existing = existing_by_name.get(name_key)

        # Build the full field dict from discovered model
        all_fields = {
            "type": model.model_type,
            "description": model.description,
            "context_length": model.context_length,
            "max_completion_tokens": model.max_completion_tokens,
            "pricing_prompt": model.pricing_prompt,
            "pricing_completion": model.pricing_completion,
            "pricing_image": model.pricing_image,
            "pricing_audio": model.pricing_audio,
            "pricing_web_search": model.pricing_web_search,
            "pricing_internal_reasoning": model.pricing_internal_reasoning,
            "pricing_input_cache_read": model.pricing_input_cache_read,
            "pricing_input_cache_write": model.pricing_input_cache_write,
            "modality": model.modality,
            "input_modalities": model.input_modalities,
            "output_modalities": model.output_modalities,
            "tokenizer": model.tokenizer,
            "instruct_type": model.instruct_type,
            "hugging_face_id": model.hugging_face_id,
            "canonical_slug": model.canonical_slug,
            "knowledge_cutoff": model.knowledge_cutoff,
            "expiration_date": model.expiration_date,
            "supported_parameters": model.supported_parameters,
            "is_moderated": model.is_moderated,
            "provider_context_length": model.provider_context_length,
            "openrouter_created_at": model.openrouter_created_at,
            "last_synced_at": now_iso,
        }

        if existing:
            existing_count += 1
            existing_id = existing.get("id", "")
            if not existing_id:
                continue

            # Check if anything actually changed to avoid unnecessary writes
            changed = False
            for k, v in all_fields.items():
                if k == "last_synced_at":
                    continue  # Always different, skip for comparison
                if existing.get(k) != v:
                    changed = True
                    break

            if changed:
                try:
                    set_clause = ", ".join(
                        f"{k} = ${k}" for k in all_fields
                    )
                    await repo_query(
                        f"UPDATE {existing_id} SET {set_clause}",
                        all_fields,
                    )
                    updated_count += 1
                except Exception as e:
                    logger.warning(f"Failed to update model {model.name}: {e}")
            else:
                # Only update sync timestamp
                try:
                    await repo_query(
                        f"UPDATE {existing_id} SET last_synced_at = $ts",
                        {"ts": now_iso},
                    )
                except Exception:
                    pass  # Non-critical
        else:
            # Create new model with ALL metadata
            try:
                new_model = Model(
                    name=model.name,
                    provider=model.provider,
                    **all_fields,
                )
                await new_model.save()
                new_count += 1
                logger.info(f"Registered new model: {model.provider}/{model.name} ({model.model_type})")
            except Exception as e:
                logger.warning(f"Failed to register model {model.name}: {e}")

    # Update sync_status record
    try:
        await repo_query(
            "UPSERT sync_status SET provider = $provider, last_sync = $now, "
            "models_synced = $synced, models_updated = $updated, models_added = $added, "
            "next_sync = $next WHERE provider = $provider",
            {
                "provider": provider,
                "now": now_iso,
                "synced": discovered_count,
                "updated": updated_count,
                "added": new_count,
                "next": datetime(datetime.now(timezone.utc).year,
                                 datetime.now(timezone.utc).month,
                                 datetime.now(timezone.utc).day,
                                 3, 0, 0, tzinfo=timezone.utc).isoformat(),
            },
        )
    except Exception as e:
        logger.warning(f"Failed to update sync_status for {provider}: {e}")

    logger.info(
        f"Synced {provider}: {discovered_count} discovered, "
        f"{new_count} new, {existing_count} existing, {updated_count} updated"
    )
    return discovered_count, new_count, existing_count


async def sync_all_providers() -> Dict[str, Tuple[int, int, int]]:
    """
    Sync models for all configured providers.

    Returns:
        Dict mapping provider names to (discovered, new, existing) tuples
    """
    results = {}

    # Run discovery for all providers in parallel
    tasks = []
    providers = list(PROVIDER_DISCOVERY_FUNCTIONS.keys())

    for provider in providers:
        tasks.append(sync_provider_models(provider, auto_register=True))

    task_results = await asyncio.gather(*tasks, return_exceptions=True)

    for provider, result in zip(providers, task_results):
        if isinstance(result, Exception):
            logger.error(f"Error syncing {provider}: {result}")
            results[provider] = (0, 0, 0)
        else:
            results[provider] = result

    return results


async def get_provider_model_count(provider: str) -> Dict[str, int]:
    """
    Get count of registered models for a provider, grouped by type.

    Args:
        provider: Provider name (case-insensitive)

    Returns:
        Dict mapping model type to count
    """
    # Use case-insensitive comparison by lowercasing the provider
    result = await repo_query(
        "SELECT type, count() as count FROM model WHERE string::lowercase(provider) = string::lowercase($provider) GROUP BY type",
        {"provider": provider},
    )

    counts = {
        "language": 0,
        "embedding": 0,
        "reranking": 0,
        "image_generation": 0,
        "audio": 0,
        "video": 0,
        "speech_to_text": 0,
        "text_to_speech": 0,
    }

    for row in result:
        model_type = row.get("type")
        count = row.get("count", 0)
        if model_type in counts:
            counts[model_type] = count

    return counts
