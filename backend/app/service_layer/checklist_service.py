from datetime import datetime, timezone
from typing import List
from bson import ObjectId
from fastapi import HTTPException, status

from ..models import Event, ChecklistItem, ChecklistItemCreate, ChecklistItemUpdate, User
from ..database import get_database
from ..websocket import manager
from ..services import push_notification_service
from pymongo import ReturnDocument


class ChecklistService:
    def __init__(self, db):
        self.db = db

    async def _get_event_with_access(self, event_id: str, user: User) -> Event:
        if not ObjectId.is_valid(event_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event ID")
        event_doc = await self.db.events.find_one({"_id": ObjectId(event_id)})
        if not event_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        event = Event(**event_doc)
        user_id_str = str(user.id)
        if user_id_str not in [str(a) for a in event.attendees] and str(event.created_by) != user_id_str:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this event")
        return event

    async def list_items(self, event_id: str, user: User) -> List[ChecklistItem]:
        _ = await self._get_event_with_access(event_id, user)
        cursor = self.db.event_checklist_items.find({"event_id": event_id}).sort("created_at", 1)
        return [ChecklistItem(**doc) async for doc in cursor]

    async def create_item(self, event_id: str, item_data: ChecklistItemCreate, user: User) -> ChecklistItem:
        _ = await self._get_event_with_access(event_id, user)
        item_dict = item_data.model_dump()
        item_dict["event_id"] = event_id
        item_dict["created_by"] = str(user.id)
        item_dict["created_at"] = datetime.now(timezone.utc)
        item_dict["updated_at"] = datetime.now(timezone.utc)
        result = await self.db.event_checklist_items.insert_one(item_dict)
        created = await self.db.event_checklist_items.find_one({"_id": result.inserted_id})
        if not created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create checklist item")
        item = ChecklistItem(**created)
        await manager.broadcast_to_event(event_id, {"type": "new_checklist_item", "data": item.model_dump(mode='json')})
        
        # Send push notification to assignee if different from creator
        user_id_str = str(user.id)
        if item.assigned_to and str(item.assigned_to) != user_id_str:
            await push_notification_service.send_notifications_to_user(
                db=self.db,
                user_id=str(item.assigned_to),
                payload={
                    "title": "Checklist Item Assigned",
                    "body": f"You have been assigned a new checklist item: {item.title}",
                    "data": {
                        "type": "checklist_item",
                        "event_id": event_id,
                        "item_id": str(item.id)
                    }
                },
                topic="checklists"
            )
        return item

    async def update_item(self, event_id: str, item_id: str, item_update: ChecklistItemUpdate, user: User) -> ChecklistItem:
        _ = await self._get_event_with_access(event_id, user)
        if not ObjectId.is_valid(item_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid item ID")
        # Validate exists
        item_doc = await self.db.event_checklist_items.find_one({"_id": ObjectId(item_id), "event_id": event_id})
        if not item_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found")
        update_data = item_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        if "completed" in update_data:
            if update_data["completed"]:
                update_data["completed_by"] = str(user.id)
                update_data["completed_at"] = datetime.now(timezone.utc)
            else:
                update_data["completed_by"] = None
                update_data["completed_at"] = None
        
        # Handle assigned_to updates
        user_id_str = str(user.id)
        if "assigned_to" in update_data and str(update_data["assigned_to"]) != user_id_str:
            # Get the item title for the notification
            item_doc = await self.db.event_checklist_items.find_one({"_id": ObjectId(item_id)})
            item_title = item_doc.get("title", "Checklist Item") if item_doc else "Checklist Item"
            
            # Send push notification to new assignee
            await push_notification_service.send_notifications_to_user(
                db=self.db,
                user_id=str(update_data["assigned_to"]),
                payload={
                    "title": "Checklist Item Assigned",
                    "body": f"You have been assigned a checklist item: {item_title}",
                    "data": {
                        "type": "checklist_item",
                        "event_id": event_id,
                        "item_id": item_id
                    }
                },
                topic="checklists"
            )
        
        updated_doc = await self.db.event_checklist_items.find_one_and_update(
            {"_id": ObjectId(item_id)},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER,
        )
        if not updated_doc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update checklist item")
        item = ChecklistItem(**updated_doc)
        await manager.broadcast_to_event(event_id, {"type": "update_checklist_item", "data": item.model_dump(mode='json')})
        return item

    async def delete_item(self, event_id: str, item_id: str, user: User) -> None:
        _ = await self._get_event_with_access(event_id, user)
        if not ObjectId.is_valid(item_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid item ID")
        item_doc = await self.db.event_checklist_items.find_one({"_id": ObjectId(item_id), "event_id": event_id})
        if not item_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found")
        # Only creator can delete
        item = ChecklistItem(**item_doc)
        if str(item.created_by) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only item creator can delete this checklist item")
        result = await self.db.event_checklist_items.delete_one({"_id": ObjectId(item_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete checklist item")
        await manager.broadcast_to_event(event_id, {"type": "delete_checklist_item", "data": {"item_id": item_id}})


def get_checklist_service() -> 'ChecklistService':
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return ChecklistService(db)
