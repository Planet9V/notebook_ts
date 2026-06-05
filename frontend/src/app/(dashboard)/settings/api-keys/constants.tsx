import React from 'react'
import {
  MessageSquare,
  Code,
  Mic,
  Volume2,
  ArrowUpDown,
  ImageIcon,
  Music,
  Film,
} from 'lucide-react'

export type ModelType = 'language' | 'embedding' | 'reranking' | 'image_generation' | 'audio' | 'video' | 'text_to_speech' | 'speech_to_text'

// Provider display names
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
  groq: 'Groq',
  mistral: 'Mistral AI',
  deepseek: 'DeepSeek',
  xai: 'xAI (Grok)',
  openrouter: 'OpenRouter',
  perplexity: 'Perplexity',
  valyu: 'Valyu (Search)',
  tavily: 'Tavily',
  newsapi: 'NewsAPI',
  finnhub: 'Finnhub',
  eia: 'EIA.gov',
  codacy: 'Codacy',
  censys: 'Censys',
  fred: 'FRED',
  tripo: 'Tripo',
  stitch: 'Stitch',
  huggingface: 'Hugging Face',
  mapbox: 'Mapbox',
  brave: 'Brave Search',
  voyage: 'Voyage AI',
  elevenlabs: 'ElevenLabs',
  ollama: 'Ollama',
  azure: 'Azure OpenAI',
  vertex: 'Google Vertex AI',
  openai_compatible: 'OpenAI Compatible',
  dashscope: 'DashScope (Qwen)',
  minimax: 'MiniMax',
}

// All providers in display order
export const ALL_PROVIDERS = [
  'openai', 'anthropic', 'google', 'groq', 'mistral', 'deepseek',
  'xai', 'openrouter', 'perplexity', 'valyu', 'tavily', 'newsapi', 'brave',
  'finnhub', 'eia', 'fred', 'censys', 'codacy', 'tripo', 'stitch',
  'huggingface', 'mapbox',
  'dashscope', 'minimax', 'voyage', 'elevenlabs', 'ollama',
  'azure', 'vertex', 'openai_compatible',
]

// Default modalities per provider
export const PROVIDER_MODALITIES: Record<string, ModelType[]> = {
  openai: ['language', 'embedding', 'image_generation', 'text_to_speech', 'speech_to_text'],
  anthropic: ['language'],
  google: ['language', 'embedding', 'image_generation', 'audio', 'text_to_speech', 'speech_to_text'],
  groq: ['language', 'speech_to_text'],
  mistral: ['language', 'embedding'],
  deepseek: ['language'],
  xai: ['language'],
  openrouter: ['language', 'embedding', 'reranking', 'image_generation', 'audio', 'video'],
  perplexity: ['language'],
  valyu: [],
  tavily: [],
  newsapi: [],
  finnhub: [],
  eia: [],
  codacy: [],
  censys: [],
  fred: [],
  tripo: [],
  stitch: [],
  huggingface: ['language', 'embedding'],
  mapbox: [],
  brave: [],
  voyage: ['embedding'],
  elevenlabs: ['text_to_speech', 'speech_to_text'],
  ollama: ['language', 'embedding', 'reranking'],
  azure: ['language', 'embedding', 'text_to_speech', 'speech_to_text'],
  vertex: ['language', 'embedding', 'text_to_speech'],
  openai_compatible: ['language', 'embedding', 'text_to_speech', 'speech_to_text'],
  dashscope: ['language'],
  minimax: ['language'],
}

// Documentation links
export const PROVIDER_DOCS: Record<string, string> = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  google: 'https://aistudio.google.com/app/apikey',
  groq: 'https://console.groq.com/keys',
  mistral: 'https://console.mistral.ai/api-keys/',
  deepseek: 'https://platform.deepseek.com/api_keys',
  xai: 'https://console.x.ai/',
  openrouter: 'https://openrouter.ai/keys',
  perplexity: 'https://docs.perplexity.ai/',
  valyu: 'https://docs.tavily.com/',
  tavily: 'https://docs.tavily.com/',
  newsapi: 'https://newsapi.org/account',
  finnhub: 'https://finnhub.io/dashboard',
  eia: 'https://www.eia.gov/opendata/register.php',
  codacy: 'https://app.codacy.com/account/api-tokens',
  censys: 'https://search.censys.io/account/api',
  fred: 'https://fred.stlouisfed.org/docs/api/api_key.html',
  tripo: 'https://www.tripo3d.ai/app/api-key',
  stitch: 'https://www.stitchdata.com/docs/developers/import-api',
  huggingface: 'https://huggingface.co/settings/tokens',
  mapbox: 'https://account.mapbox.com/access-tokens/',
  brave: 'https://brave.com/search/api/',
  voyage: 'https://dash.voyageai.com/api-keys',
  elevenlabs: 'https://elevenlabs.io/app/settings/api-keys',
  azure: 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI',
  vertex: 'https://cloud.google.com/vertex-ai/docs/start/cloud-environment',
  openai_compatible: 'https://github.com/lfnovo/open-notebook/blob/main/docs/5-CONFIGURATION/openai-compatible.md',
  dashscope: 'https://help.aliyun.com/zh/model-studio/getting-started/',
  minimax: 'https://platform.minimaxi.com/document/Guides',
}

export const TYPE_ICONS: Record<ModelType, React.ReactNode> = {
  language: <MessageSquare className="h-3 w-3" />,
  embedding: <Code className="h-3 w-3" />,
  reranking: <ArrowUpDown className="h-3 w-3" />,
  image_generation: <ImageIcon className="h-3 w-3" />,
  audio: <Music className="h-3 w-3" />,
  video: <Film className="h-3 w-3" />,
  text_to_speech: <Volume2 className="h-3 w-3" />,
  speech_to_text: <Mic className="h-3 w-3" />,
}

export const TYPE_COLORS: Record<ModelType, string> = {
  language: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  embedding: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  reranking: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  image_generation: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  audio: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  video: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  text_to_speech: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  speech_to_text: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
}

export const TYPE_COLOR_INACTIVE = 'bg-muted text-muted-foreground opacity-50'

export const TYPE_LABELS: Record<ModelType, string> = {
  language: 'Language',
  embedding: 'Embedding',
  reranking: 'Reranking',
  image_generation: 'Image',
  audio: 'Audio',
  video: 'Video',
  text_to_speech: 'TTS',
  speech_to_text: 'STT',
}
