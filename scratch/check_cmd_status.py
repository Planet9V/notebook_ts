import asyncio
from dotenv import load_dotenv
load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    res = await repo_query("SELECT * FROM command:je1hixg8h076yuz2xj4a")
    if res:
        cmd = res[0]
        print(f"Command ID: {cmd.get('id')}")
        print(f"Status: {cmd.get('status')}")
        print(f"Error Message: {cmd.get('error_message')}")
        print(f"Result: {bool(cmd.get('result'))}")
    else:
        print("Command not found!")

if __name__ == "__main__":
    asyncio.run(main())
