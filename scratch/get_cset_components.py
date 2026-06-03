import asyncio
import dotenv
import re
dotenv.load_dotenv()

from open_notebook.database.repository import repo_query

async def main():
    q_res = await repo_query(
        "SELECT standard_code FROM question WHERE type::string(regulation_id) = 'regulation:Components'"
    )
    prefixes = set()
    for item in q_res:
        code = item.get('standard_code')
        if code:
            # Strip trailing numbers (e.g. "Router 12" -> "Router", "VLAN Switch 16" -> "VLAN Switch")
            prefix = re.sub(r'\s+\d+$', '', code.strip())
            prefixes.add(prefix)
            
    print(f"Total unique component prefixes in CSET: {len(prefixes)}")
    for prefix in sorted(list(prefixes)):
        print(f"- {prefix}")

if __name__ == '__main__':
    asyncio.run(main())
