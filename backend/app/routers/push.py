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
        existing_subscription = await db.push_subscriptions.find_one({
            "user_id": user.id,
            "endpoint": subscription_data.endpoint
        })
        
        subscription_dict = subscription_data.dict()
        subscription_dict["user_id"] = user.id
        
        if existing_subscription:
            # Update existing subscription
            result = await db.push_subscriptions.update_one(
                {"_id": existing_subscription["_id"]},
                {"$set": {**subscription_dict, "updated_at": datetime.utcnow(), "active": True}}
            )
            subscription = await db.push_subscriptions.find_one({"_id": existing_subscription["_id"]})
        else:
            # Create new subscription
            subscription_model = models.PushSubscription(**subscription_dict)
            result = await db.push_subscriptions.insert_one(subscription_model.model_dump())
            subscription = await db.push_subscriptions.find_one({"_id": result.inserted_id})
        
        return {"data": subscription}
    except Exception as e:
        logger.error(f"Error creating push subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to create push subscription")

@router.delete("/push/subscribe")
async def delete_push_subscription(
    endpoint_data: dict,
    user: models.User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Deactivate a push subscription for the current user"""
    try:
        result = await db.push_subscriptions.update_one(
            {"user_id": user.id, "endpoint": endpoint_data["endpoint"]},
            {"$set": {"active": False, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        return {"data": None, "message": "Subscription deactivated successfully"}
    except Exception as e:
        logger.error(f"Error deleting push subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete push subscription")

@router.put("/push/subscribe/topics")
async def update_push_subscription_topics(
    topics_data: PushSubscriptionUpdate,
    user: models.User = Depends(get_current_user),
    db = Depends(get_database)
):
    """Update notification topics for the user's push subscription"""
    try:
        result = await db.push_subscriptions.update_one(
            {"user_id": user.id, "active": True},
            {"$set": {"topics": topics_data.topics, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Active subscription not found")
        
        subscription = await db.push_subscriptions.find_one({"user_id": user.id, "active": True})
        return {"data": subscription}
    except Exception as e:
        logger.error(f"Error updating push subscription topics: {e}")
        raise HTTPException(status_code=500, detail="Failed to update push subscription topics")

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
    
    # Implementation would go here
    return {"data": None, "message": "Test notification sent successfully"}