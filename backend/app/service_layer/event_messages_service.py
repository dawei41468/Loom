from datetime import datetime, timezone
from typing import List
from bson import ObjectId
from fastapi import HTTPException, status

from ..models import Event, EventMessage, EventMessageCreate, User
from ..database import get_database
from ..websocket import manager
from ..services import push_notification_service


class EventMessagesService:
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

    async def list_messages(self, event_id: str, user: User) -> List[EventMessage]:
        _ = await self._get_event_with_access(event_id, user)
        cursor = self.db.event_messages.find({"event_id": event_id}).sort("created_at", 1)
        return [EventMessage(**doc) async for doc in cursor]

    async def send_message(self, event_id: str, message_data: EventMessageCreate, user: User) -> EventMessage:
        _ = await self._get_event_with_access(event_id, user)
        message_dict = message_data.model_dump()
        message_dict["event_id"] = event_id
        message_dict["sender_id"] = str(user.id)
        message_dict["created_at"] = datetime.now(timezone.utc)
        message_dict["updated_at"] = datetime.now(timezone.utc)
        result = await self.db.event_messages.insert_one(message_dict)
        created = await self.db.event_messages.find_one({"_id": result.inserted_id})
        if not created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create message")
        message = EventMessage(**created)
        await manager.broadcast_to_event(event_id, {"type": "new_message", "data": message.model_dump(mode='json')})
        
        # Send push notification to recipient
        # Get event to find recipient (partner)
        event_doc = await self.db.events.find_one({"_id": ObjectId(event_id)})
        if event_doc:
            # Find the partner user ID (the other user in the partnership)
            user_id_str = str(user.id)
            partner_id = None
            
            # Get partnership where user is either user1 or user2
            partnership = await self.db.partnerships.find_one({
                "$or": [
                    {"user1_id": user_id_str, "status": "accepted"},
                    {"user2_id": user_id_str, "status": "accepted"}
                ]
            })
            
            if partnership:
                # Determine partner ID (the other user in the partnership)
                if partnership["user1_id"] == user_id_str:
                    partner_id = partnership["user2_id"]
                else:
                    partner_id = partnership["user1_id"]
                
                # Send push notification to partner
                await push_notification_service.send_notifications_to_user(
                    db=self.db,
                    user_id=partner_id,
                    payload={
                        "title": "New Message",
                        "body": "You have a new message",
                        "data": {
                            "type": "chat_message",
                            "event_id": event_id,
                            "message_id": str(message.id)
                        }
                    },
                    topic="chat"
                )
        
        return message

    async def delete_message(self, event_id: str, message_id: str, user: User) -> None:
        _ = await self._get_event_with_access(event_id, user)
        if not ObjectId.is_valid(message_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid message ID")
        message_doc = await self.db.event_messages.find_one({"_id": ObjectId(message_id), "event_id": event_id})
        if not message_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        message = EventMessage(**message_doc)
        if str(message.sender_id) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only message sender can delete this message")
        result = await self.db.event_messages.delete_one({"_id": ObjectId(message_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete message")
        await manager.broadcast_to_event(event_id, {"type": "delete_message", "data": {"message_id": message_id}})


def get_event_messages_service() -> EventMessagesService:
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return EventMessagesService(db)
