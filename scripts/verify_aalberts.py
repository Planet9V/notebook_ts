#!/usr/bin/env python3
import asyncio

import httpx


async def main():
    async with httpx.AsyncClient() as client:
        # Check suggested links for Aalberts NA notebook
        r = await client.get("http://localhost:5055/api/notes/suggested-links?notebook_id=notebook:aalberts_na")
        print(f"NA suggestions status: {r.status_code}")
        if r.status_code == 200:
            print("NA suggestions data:", r.json())
        
        # Check suggested links for Aalberts EU notebook
        r = await client.get("http://localhost:5055/api/notes/suggested-links?notebook_id=notebook:aalberts_eu")
        print(f"EU suggestions status: {r.status_code}")
        if r.status_code == 200:
            print("EU suggestions data:", r.json())

        # Check suggested links for Aalberts APAC notebook
        r = await client.get("http://localhost:5055/api/notes/suggested-links?notebook_id=notebook:aalberts_apac")
        print(f"APAC suggestions status: {r.status_code}")
        if r.status_code == 200:
            print("APAC suggestions data:", r.json())

if __name__ == "__main__":
    asyncio.run(main())
