from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from ..models import Event, EventCreate, EventUpdate, User
from ..database import get_database
from ..services import notification_service


class EventsService:
    def __init__(self, db):
        self.db = db

    async def get_events_for_user(self, user: User) -> List[Event]:
        user_id = str(user.id)
        partner_id = await self._get_partner_id(user_id)
        # Current user should see:
        # - events they created
        # - events they attend
        # - partner's events with visibility == shared, even if not an attendee
        or_conditions = [
            {"created_by": user_id},
            {"attendees": {"$in": [user_id]}},
        ]
        if partner_id:
            or_conditions.append({"visibility": "shared", "created_by": partner_id})

        cursor = self.db.events.find({"$or": or_conditions})
        return [Event(**doc) async for doc in cursor]

    async def _get_partner_id(self, user_id: str) -> Optional[str]:
        partnership = await self.db.partnerships.find_one({
            "$or": [
                {"user1_id": user_id, "status": "accepted"},
                {"user2_id": user_id, "status": "accepted"}
            ]
        })
        if not partnership:
            return None
        return partnership["user2_id"] if partnership["user1_id"] == user_id else partnership["user1_id"]

    async def create_event(self, event_data: EventCreate, user: User) -> Event:
        event_dict = event_data.model_dump()
        event_dict["created_by"] = str(user.id)
        event_dict["created_at"] = datetime.now(timezone.utc)
        event_dict["updated_at"] = datetime.now(timezone.utc)

        # Always ensure creator is included
        if str(user.id) not in event_dict["attendees"]:
            event_dict["attendees"].append(str(user.id))

        # Respect explicit attendees from frontend; do not auto-append partner.
        partner_id = await self._get_partner_id(str(user.id))
        visibility = event_dict.get("visibility", "shared")

        result = await self.db.events.insert_one(event_dict)
        created = await self.db.events.find_one({"_id": result.inserted_id})
        if not created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create event")

        event = Event(**created)
        # Notify partner for shared events, even if not an attendee (FYI visibility)
        if visibility == "shared" and partner_id:
            await notification_service.notify_event_created(partner_id, event.model_dump(mode='json'))
        return event

    async def get_event_by_id(self, event_id: str, user: User) -> Event:
        if not ObjectId.is_valid(event_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event ID")
        doc = await self.db.events.find_one({"_id": ObjectId(event_id)})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        event = Event(**doc)
        user_id_str = str(user.id)
        if user_id_str not in [str(a) for a in event.attendees] and str(event.created_by) != user_id_str:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this event")
        return event

    async def update_event(self, event_id: str, event_update: EventUpdate, user: User) -> Event:
        event = await self.get_event_by_id(event_id, user)
        if str(event.created_by) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only event creator can update this event")

        update_data = event_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        updated = await self.db.events.find_one_and_update(
            {"_id": ObjectId(event_id)},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update event")
        return Event(**updated)

    async def delete_event(self, event_id: str, user: User) -> None:
        event = await self.get_event_by_id(event_id, user)
        if str(event.created_by) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only event creator can delete this event")

        result = await self.db.events.delete_one({"_id": ObjectId(event_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete event")

        partner_id = await self._get_partner_id(str(user.id))
        if partner_id:
            await notification_service.notify_event_deleted(partner_id, event_id)


def get_events_service() -> EventsService:
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return EventsService(db)
