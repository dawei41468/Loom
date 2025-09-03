from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
from .config import settings

# MongoDB client and database instances
client: Optional[AsyncIOMotorClient] = None
database = None


async def connect_to_mongo():
    """Create optimized database connection with connection pooling"""
    global client, database

    # Connection options for performance
    client = AsyncIOMotorClient(
        settings.MONGO_URI,
        maxPoolSize=10,          # Maximum connection pool size
        minPoolSize=5,           # Minimum connection pool size
        maxIdleTimeMS=30000,     # Close connections after 30 seconds of inactivity
        serverSelectionTimeoutMS=5000,  # Timeout after 5 seconds instead of 30
        connectTimeoutMS=5000,   # Connection timeout
        socketTimeoutMS=5000,    # Socket timeout
        waitQueueTimeoutMS=5000, # Wait queue timeout
    )

    database = client[settings.MONGO_DB]
    print(f"Connected to MongoDB at {settings.MONGO_URI}/{settings.MONGO_DB}")

    # Create database indexes for performance
    await create_database_indexes()


async def create_database_indexes():
    """Create database indexes for optimal query performance"""
    if database is None:
        return

    try:
        # Users collection indexes
        await database.users.create_index("email", unique=True)
        await database.users.create_index("created_at")
        await database.users.create_index([("email", 1), ("is_onboarded", 1)])

        # Events collection indexes
        await database.events.create_index("created_by")
        await database.events.create_index("attendees")
        await database.events.create_index("start_time")
        await database.events.create_index("end_time")
        await database.events.create_index([("created_by", 1), ("start_time", -1)])
        await database.events.create_index([("attendees", 1), ("start_time", -1)])
        await database.events.create_index([("start_time", 1), ("end_time", 1)])

        # Tasks collection indexes
        await database.tasks.create_index("created_by")
        await database.tasks.create_index("completed")
        await database.tasks.create_index("due_date")
        await database.tasks.create_index([("created_by", 1), ("completed", 1)])
        await database.tasks.create_index([("created_by", 1), ("due_date", 1)])

        # Proposals collection indexes
        await database.proposals.create_index("proposed_by")
        await database.proposals.create_index("proposed_to")
        await database.proposals.create_index("status")
        await database.proposals.create_index([("proposed_to", 1), ("status", 1)])

        print("Database indexes created successfully")

    except Exception as e:
        print(f"Error creating database indexes: {e}")


async def close_mongo_connection():
    """Close database connection"""
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


def get_database():
    """Get database instance"""
    return database


async def ping_database() -> bool:
    """Ping database to check connection health"""
    try:
        if database is None:
            return False
        await database.command('ping')
        return True
    except ServerSelectionTimeoutError:
        return False
    except Exception:
        return False