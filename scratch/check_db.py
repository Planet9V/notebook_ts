import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from open_notebook.database.repository import repo_query

async def main():
    try:
        reg_count = await repo_query("SELECT count() FROM regulation GROUP ALL")
        q_count = await repo_query("SELECT count() FROM question GROUP ALL")
        print("Regulations count:", reg_count)
        print("Questions count:", q_count)
        
        # Check a sample regulation
        reg_samples = await repo_query("SELECT id, name FROM regulation LIMIT 5")
        print("Sample regulations in DB:", reg_samples)
        
        # Check how many questions under IEC_62443 or IEC_62443_3_3
        iec_count = await repo_query("SELECT count() FROM question WHERE regulation_id = 'regulation:IEC_62443' GROUP ALL")
        iec_33_count = await repo_query("SELECT count() FROM question WHERE regulation_id = 'regulation:IEC_62443_3_3' GROUP ALL")
        print("Questions for regulation:IEC_62443 count:", iec_count)
        print("Questions for regulation:IEC_62443_3_3 count:", iec_33_count)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
