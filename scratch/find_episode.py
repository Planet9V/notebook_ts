import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query, ensure_record_id

async def main():
    try:
        # Directly query in SurrealQL
        res = await repo_query("SELECT * FROM command:je1hixg8h076yuz2xj4a")
        print("Direct command query:")
        print(res)

        # Directly query in SurrealQL for episodes
        res_ep = await repo_query("SELECT * FROM episode WHERE command = command:je1hixg8h076yuz2xj4a")
        print("\nEpisodes query:")
        for ep in res_ep:
            print(f"Episode ID: {ep.get('id')}")
            print(f"Episode Name: {ep.get('name')}")
            print(f"Audio File: {ep.get('audio_file')}")
            print(f"Outline: {bool(ep.get('outline'))}")
            print(f"Transcript: {bool(ep.get('transcript'))}")
            print("-" * 20)

    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
