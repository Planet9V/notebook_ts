import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.podcasts.models import _resolve_model_config

async def main():
    print("=== Testing _resolve_model_config with model:kokoro ===")
    try:
        provider, model_name, config = await _resolve_model_config("model:kokoro")
        print(f"Provider: {provider}")
        print(f"Model Name: {model_name}")
        print(f"Config: {config}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
