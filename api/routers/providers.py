"""
Providers Router

Exposes supported providers and metadata for client consumption.

Endpoints:
- GET /providers - List all supported providers with metadata
"""

from typing import List

from fastapi import APIRouter

from api.credentials_service import check_env_configured
from api.models import ProviderInfoResponse

router = APIRouter(prefix="/providers", tags=["providers"])

SUPPORTED_PROVIDERS = [
    {"name": "openai", "display_name": "OpenAI", "modalities": ["chat", "embedding", "stt", "tts"], "docs_url": "https://platform.openai.com"},
    {"name": "anthropic", "display_name": "Anthropic", "modalities": ["chat"], "docs_url": "https://console.anthropic.com"},
    {"name": "google", "display_name": "Google Gemini", "modalities": ["chat", "embedding"], "docs_url": "https://aistudio.google.com"},
    {"name": "mistral", "display_name": "Mistral AI", "modalities": ["chat", "embedding"], "docs_url": "https://console.mistral.ai"},
    {"name": "groq", "display_name": "Groq", "modalities": ["chat", "stt"], "docs_url": "https://console.groq.com"},
    {"name": "deepseek", "display_name": "DeepSeek", "modalities": ["chat"], "docs_url": "https://platform.deepseek.com"},
    {"name": "xai", "display_name": "xAI (Grok)", "modalities": ["chat"], "docs_url": "https://x.ai"},
    {"name": "openrouter", "display_name": "OpenRouter", "modalities": ["chat"], "docs_url": "https://openrouter.ai"},
    {"name": "ollama", "display_name": "Ollama (Local)", "modalities": ["chat", "embedding"], "docs_url": "https://ollama.com"},
    {"name": "azure", "display_name": "Azure OpenAI", "modalities": ["chat", "embedding", "tts"], "docs_url": "https://portal.azure.com"},
    {"name": "openai_compatible", "display_name": "OpenAI Compatible", "modalities": ["chat", "embedding", "stt", "tts"], "docs_url": None},
    {"name": "dashscope", "display_name": "Alibaba DashScope", "modalities": ["chat"], "docs_url": None},
    {"name": "minimax", "display_name": "MiniMax", "modalities": ["chat"], "docs_url": None},
]


@router.get("", response_model=List[ProviderInfoResponse])
async def list_providers():
    """List all supported AI providers with their registry metadata."""
    return [
        ProviderInfoResponse(
            name=p["name"],
            display_name=p["display_name"],
            modalities=p["modalities"],
            docs_url=p["docs_url"],
            env_configured=check_env_configured(p["name"]),
        )
        for p in SUPPORTED_PROVIDERS
    ]
