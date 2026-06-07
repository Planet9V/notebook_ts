import asyncio
import json
import os
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice import Agent
from livekit.plugins import openai, silero
from loguru import logger
from openai import AsyncOpenAI

# Load local .env if present
load_dotenv()


async def entrypoint(ctx: JobContext):
    logger.info(f"Agent connecting to room: {ctx.room.name}")
    # Subscribe only to audio to minimize bandwidth
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the user participant to join
    logger.info("Waiting for remote participant...")
    participant = await ctx.wait_for_remote_participant()
    logger.info(f"Participant connected: {participant.identity}")

    # Extract notebook_id and session_id from participant metadata
    notebook_id = None
    session_id = None
    if participant.metadata:
        try:
            meta = json.loads(participant.metadata)
            notebook_id = meta.get("notebook_id")
            session_id = meta.get("session_id")
            logger.info(f"Extracted notebook_id: {notebook_id}, session_id: {session_id} from metadata")
        except Exception as e:
            logger.warning(f"Could not parse participant metadata '{participant.metadata}': {e}")

    # Detect execution environment
    is_docker = os.path.exists("/.dockerenv")
    api_url = "http://open_notebook:5055/api" if is_docker else "http://localhost:5055/api"
    whisper_url = "http://whisper-stt:8000/v1" if is_docker else "http://localhost:8881/v1"
    kokoro_url = "http://kokoro-tts:8880/v1" if is_docker else "http://localhost:8880/v1"

    logger.info(f"Voice Agent config: API={api_url}, Whisper={whisper_url}, Kokoro={kokoro_url}")

    # 1. Custom LLM client proxying to our FastAPI completions endpoint
    llm_client = AsyncOpenAI(
        base_url=f"{api_url}/voice/agent/llm/v1",
        api_key="none",
        default_headers={
            "X-Notebook-ID": notebook_id or "",
            "X-Session-ID": session_id or ""
        },
    )
    agent_llm = openai.LLM(model="default", client=llm_client)

    # 2. Local Whisper STT
    stt = openai.STT(
        model="Systran/faster-whisper-base",
        base_url=whisper_url,
        api_key="none",
    )

    # 3. Local Kokoro TTS
    tts = openai.TTS(
        model="kokoro",
        base_url=kokoro_url,
        api_key="none",
        voice="af_heart",
    )

    initial_ctx = llm.ChatContext().append(
        role="system",
        text="You are a helpful voice AI assistant. Respond concisely.",
    )

    # 4. Initialize agent session
    agent = Agent(
        stt=stt,
        tts=tts,
        llm=agent_llm,
        vad=silero.VAD.load(),
        chat_ctx=initial_ctx,
        allow_interruptions=True,
    )

    # Start the voice session
    agent.start(ctx.room, participant)
    logger.info("Voice Agent session started successfully.")

    # Greet the user
    await agent.say("Hello! How can I help you today?", allow_interruptions=True)


def load_livekit_settings():
    import urllib.request
    import json
    import time
    
    # Try loading from local API with retries (up to 15 times, 2s sleep)
    is_docker = os.path.exists("/.dockerenv")
    url = "http://127.0.0.1:5055/api/voice/settings"
    
    logger.info(f"Worker fetching LiveKit configuration from {url}...")
    for attempt in range(15):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    logger.info(f"Successfully loaded LiveKit settings from API (attempt {attempt+1})")
                    mode = data.get("livekit_mode", "local")
                    if mode == "remote":
                        remote_url = data.get("livekit_remote_ws_url")
                        remote_key = data.get("livekit_remote_api_key")
                        remote_secret = data.get("livekit_remote_api_secret")
                        
                        if remote_url:
                            os.environ["LIVEKIT_URL"] = remote_url
                            logger.info(f"Overriding LIVEKIT_URL with remote: {remote_url}")
                        if remote_key:
                            os.environ["LIVEKIT_API_KEY"] = remote_key
                            logger.info("Overriding LIVEKIT_API_KEY with remote key")
                        if remote_secret:
                            os.environ["LIVEKIT_API_SECRET"] = remote_secret
                            logger.info("Overriding LIVEKIT_API_SECRET with remote secret")
                    else:
                        logger.info("LiveKit mode is local, setting default environment variables if not present")
                        if "LIVEKIT_URL" not in os.environ:
                            default_url = "ws://livekit-server:7880" if is_docker else "ws://localhost:7880"
                            os.environ["LIVEKIT_URL"] = default_url
                            logger.info(f"Setting default local LIVEKIT_URL: {default_url}")
                        if "LIVEKIT_API_KEY" not in os.environ:
                            os.environ["LIVEKIT_API_KEY"] = "devkey"
                            logger.info("Setting default local LIVEKIT_API_KEY")
                        if "LIVEKIT_API_SECRET" not in os.environ:
                            os.environ["LIVEKIT_API_SECRET"] = "secret"
                            logger.info("Setting default local LIVEKIT_API_SECRET")
                    return
        except Exception as e:
            logger.warning(f"Failed to fetch LiveKit settings on attempt {attempt+1}: {e}")
            time.sleep(2)
    logger.error("Could not fetch LiveKit settings from API after 15 attempts. Using environment/default settings.")


if __name__ == "__main__":
    load_livekit_settings()
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
