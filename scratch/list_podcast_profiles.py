import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    try:
        ep_profiles = await repo_query("SELECT name, speaker_config, outline_llm, transcript_llm FROM episode_profile")
        print("=== Episode Profiles ===")
        for ep in ep_profiles:
            print(f"Name: {ep.get('name')}")
            print(f"  Speaker Config: {ep.get('speaker_config')}")
            print(f"  Outline LLM: {ep.get('outline_llm')}")
            print(f"  Transcript LLM: {ep.get('transcript_llm')}")
            print("-" * 20)

        sp_profiles = await repo_query("SELECT name, voice_model, speakers FROM speaker_profile")
        print("\n=== Speaker Profiles ===")
        for sp in sp_profiles:
            print(f"Name: {sp.get('name')}")
            print(f"  Voice Model: {sp.get('voice_model')}")
            print(f"  Speakers: {[s.get('name') for s in sp.get('speakers', [])]}")
            print("-" * 20)

    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
