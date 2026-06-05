import asyncio
from open_notebook.database.repository import repo_query

async def main():
    res = await repo_query("SELECT * FROM speaker_profile")
    for r in res:
        print(f"Profile: {r.get('name')} (id: {r.get('id')})")
        print(f"  voice_model: {r.get('voice_model')}")
        print(f"  tts_provider: {r.get('tts_provider')}")
        print(f"  tts_model: {r.get('tts_model')}")
        print(f"  speakers: {r.get('speakers')}")
        print("-" * 40)

    print("\n=== MODELS ===")
    models = await repo_query("SELECT * FROM model")
    for m in models:
        print(f"Model: {m.get('name')} (id: {m.get('id')})")
        print(f"  provider: {m.get('provider')}")
        print(f"  type: {m.get('type')}")
        print(f"  credential: {m.get('credential')}")
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
