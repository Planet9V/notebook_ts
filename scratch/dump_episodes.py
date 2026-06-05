import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    try:
        episodes = await repo_query("SELECT * FROM episode")
        print(f"Found {len(episodes)} episodes in db:")
        for ep in episodes:
            print(f"\nID: {ep.get('id')}")
            print(f"Name: {ep.get('name')}")
            print(f"Audio File: {ep.get('audio_file')}")
            print(f"Command ID: {ep.get('command')}")
            
            # Fetch command info if exists
            cmd_id = ep.get('command')
            if cmd_id:
                cmd_info = await repo_query(f"SELECT * FROM {cmd_id}")
                if cmd_info:
                    cmd = cmd_info[0]
                    print(f"Command Status: {cmd.get('status')}")
                    print(f"Command Error: {cmd.get('error_message')}")
                    print(f"Command Result: {cmd.get('result')}")
                else:
                    print("Command record not found in database!")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
