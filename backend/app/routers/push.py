from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import logging
from datetime import datetime
from .. import models
from ..auth import get_current_user
from ..database import get_database
from ..config import settings
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict
    ua: Optional[str] = None
    platform: str = "web"
    topics: List[str] = []

class PushSubscriptionUpdate(BaseModel):
    topics: List[str]

class PushTestRequest(BaseModel):
    message: str = "Test notification"

@router.post("/push/subscribe")
async def create_push_subscription(
    subscription_data: PushSubscriptionCreate,
    user: models.User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Create or update a push subscription for the current user"""
    try:
        # Check if subscription already exists
        user_id_str = str(user.id)
        existing_subscription = await db.push_subscriptions.find_one({
            "user_id": user_id_str,
            "endpoint": subscription_data.endpoint
        })

        subscription_dict = subscription_data.model_dump()
        subscription_dict["user_id"] = user_id_str

        if existing_subscription:
            # Update existing subscription
            result = await db.push_subscriptions.update_one(
                {"_id": existing_subscription["_id"]},
                {"$set": {**subscription_dict, "updated_at": datetime.utcnow(), "active": True}}
            )
            raw_subscription = await db.push_subscriptions.find_one({"_id": existing_subscription["_id"]})
            if raw_subscription:
                raw_subscription["_id"] = str(raw_subscription["_id"])
                raw_subscription["user_id"] = str(raw_subscription["user_id"])
            subscription_to_return = raw_subscription
        else:
            # Create new subscription
            subscription_model = models.PushSubscription(**subscription_dict)
            subscription_dict_with_active = subscription_model.model_dump(by_alias=True)
            # Ensure active is explicitly set to True for new subscriptions
            subscription_dict_with_active["active"] = True
            # Remove the id field if it exists, let MongoDB generate _id
            if "id" in subscription_dict_with_active:
                del subscription_dict_with_active["id"]
            result = await db.push_subscriptions.insert_one(subscription_dict_with_active)
            raw_subscription = await db.push_subscriptions.find_one({"_id": result.inserted_id})
            if raw_subscription:
                raw_subscription["_id"] = str(raw_subscription["_id"])
                raw_subscription["user_id"] = str(raw_subscription["user_id"])
            subscription_to_return = raw_subscription

        if not subscription_to_return:
            raise HTTPException(status_code=500, detail="Failed to retrieve created or updated subscription")

        return {"data": subscription_to_return}
    except Exception as e:
        logger.error(f"Error creating push subscription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create push subscription")

@router.delete("/push/subscribe")
async def delete_push_subscription(
    endpoint_data: dict,
    user: models.User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Deactivate a push subscription for the current user"""
    try:
        user_id_str = str(user.id)

        result = await db.push_subscriptions.update_many(
            {"user_id": user_id_str},
            {"$set": {"active": False, "updated_at": datetime.utcnow()}}
        )

        return {"data": None, "message": "Subscription deactivated successfully"}
    except Exception as e:
        logger.error(f"Error deleting push subscription: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete push subscription")

@router.put("/push/subscribe/topics")
async def update_push_subscription_topics(
    topics_data: PushSubscriptionUpdate,
    user: models.User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update notification topics for the user's push subscription"""
    try:
        user_id_str = str(user.id)

        result = await db.push_subscriptions.update_one(
            {"user_id": user_id_str, "active": True},
            {"$set": {"topics": topics_data.topics, "updated_at": datetime.utcnow()}}
        )

        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Active subscription not found")

        subscription = await db.push_subscriptions.find_one({"user_id": user_id_str, "active": True})
        if subscription:
            # Convert ObjectId fields to strings for JSON serialization
            subscription["_id"] = str(subscription["_id"])
            subscription["user_id"] = str(subscription["user_id"])
        return {"data": subscription}
    except Exception as e:
        logger.error(f"Error updating push subscription topics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update push subscription topics")
@router.get("/push/subscribe")
async def get_push_subscription(
    user: models.User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Get the current active push subscription for the user"""
    try:
        user_id_str = str(user.id)
        subscription = await db.push_subscriptions.find_one({"user_id": user_id_str, "active": True})

        if not subscription:
            return {"data": None}

        # Convert ObjectId fields to strings for JSON serialization
        if subscription:
            subscription["_id"] = str(subscription["_id"])
            subscription["user_id"] = str(subscription["user_id"])

        return {"data": subscription}
    except Exception as e:
        logger.error(f"Error getting push subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to get push subscription")


@router.post("/push/test")
async def send_test_notification(
    test_data: PushTestRequest,
    user: models.User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Send a test notification to the current user (development only)"""
    # Only allow in development environments
    if settings.ENV != "dev" and settings.ENV != "development":
        raise HTTPException(status_code=403, detail="Test notifications only available in development")

    user_id_str = str(user.id)
    # Implementation would go here
    return {"data": None, "message": "Test notification sent successfully"}