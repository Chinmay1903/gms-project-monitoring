# scripts/seed.py
import asyncio
from pg_db import database  # <- your Database(...) instance
from seeder.seed_dummy_data import seed_dummy_data  # <- import the function you pasted

async def main():
    await database.connect()
    try:
        summary = await seed_dummy_data()
        print("✅ Seed done:", summary)
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
