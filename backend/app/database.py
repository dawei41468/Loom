from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

# MongoDB client and database instances
client: Optional[AsyncIOMotorClient] = None
database = None


async def connect_to_mongo():
    """Create database connection"""
    global client, database
    client = AsyncIOMotorClient(settings.MONGO_URI)
    database = client[settings.MONGO_DB]
    print(f"Connected to MongoDB at {settings.MONGO_URI}/{settings.MONGO_DB}")


async def close_mongo_connection():
    """Close database connection"""
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


def get_database():
    """Get database instance"""
    return database