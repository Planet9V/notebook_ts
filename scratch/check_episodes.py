import asyncio
from dotenv import load_dotenv
load_dotenv()
from open_notebook.database.repository import repo_query

async def main():
    try:
        episodes = await repo_query("SELECT * FROM episode;")
        print(f"Found {len(episodes)} episodes:")
        for ep in episodes:
            print(f"- ID: {ep.get('id')}")
            print(f"  Title: {ep.get('title')}")
            print(f"  Status: {ep.get('status')}")
            print(f"  Audio Path: {ep.get('audio_path')}")
            print(f"  Generated Audio Path: {ep.get('generated_audio_path')}")
            print(f"  Created: {ep.get('created')}")
            print(f"  File Path: {ep.get('file_path')}")
            print(f"  URL: {ep.get('url')}")
            # Check dialogue transcript count
            dialogue = ep.get('dialogue', [])
            print(f"  Dialogue segments: {len(dialogue)}")
    except Exception as e:
        print("Error querying episodes:", e)

if __name__ == "__main__":
    asyncio.run(main())
