from datetime import datetime, timezone
from fastapi import HTTPException, status
from bson import ObjectId
from . import models
from .database import get_database
from .websocket import manager


class NotificationService:
    def __init__(self, connection_manager):
        self.manager = connection_manager

    async def notify_partner_disconnection(self, partner_user_id: str, disconnected_by_user: str):
        """Notify partner that they have been disconnected"""
        message = {
            "type": "partner_disconnected",
            "data": {
                "disconnected_by": disconnected_by_user,
                "message": "Your partner has disconnected from you"
            }
        }
        await self.manager.send_notification(partner_user_id, message)

    async def notify_partner_connection(self, partner_user_id: str, connected_by_user: str):
        """Notify partner that a user has connected with them"""
        message = {
            "type": "partner_connected",
            "data": {
                "connected_by": connected_by_user,
                "message": "A user has connected with you"
            }
        }
        await self.manager.send_notification(partner_user_id, message)

    async def notify_proposal_created(self, partner_user_id: str, proposal_data: dict):
        """Notify partner that a new proposal has been created"""
        message = {"type": "proposal_created", "data": proposal_data}
        await self.manager.send_notification(partner_user_id, message)

    async def notify_proposal_updated(self, partner_user_id: str, proposal_data: dict):
        """Notify partner that a proposal has been updated"""
        message = {"type": "proposal_updated", "data": proposal_data}
        await self.manager.send_notification(partner_user_id, message)

    async def notify_event_created(self, partner_user_id: str, event_data: dict):
        """Notify partner that a new event has been created"""
        message = {"type": "event_created", "data": event_data}
        await self.manager.send_notification(partner_user_id, message)

    async def notify_event_deleted(self, partner_user_id: str, event_id: str):
        """Notify partner that an event has been deleted"""
        message = {"type": "event_deleted", "data": {"event_id": event_id}}
        await self.manager.send_notification(partner_user_id, message)


notification_service = NotificationService(manager)

class ProposalService:
    def __init__(self, db, notification_service):
        self.db = db
        self.notification_service = notification_service

    async def get_proposals_for_user(self, user: models.User):
        proposals_cursor = self.db.proposals.find({
            "$or": [
                {"proposed_by": str(user.id)},
                {"proposed_to": str(user.id)}
            ]
        })
        return [models.Proposal(**doc) async for doc in proposals_cursor]

    async def create_proposal(self, proposal_data: models.ProposalCreate, user: models.User):
        if str(proposal_data.proposed_to) == str(user.id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot propose to yourself")

        proposed_to_user = await self.db.users.find_one({"_id": ObjectId(proposal_data.proposed_to)})
        if not proposed_to_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposed recipient not found")

        proposal_dict = proposal_data.model_dump()
        proposal_dict["proposed_by"] = str(user.id)
        proposal_dict["status"] = "pending"
        proposal_dict["created_at"] = datetime.now(timezone.utc)
        proposal_dict["updated_at"] = datetime.now(timezone.utc)

        result = await self.db.proposals.insert_one(proposal_dict)
        created_proposal = await self.db.proposals.find_one({"_id": result.inserted_id})
        if not created_proposal:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create proposal")

        proposal = models.Proposal(**created_proposal)
        await self.notification_service.notify_proposal_created(
            str(proposal.proposed_to),
            {"proposal": proposal.model_dump(), "message": f"New proposal from {user.display_name}"}
        )
        return proposal

    async def accept_proposal(self, proposal_id: str, selected_time_slot: models.TimeSlot, user: models.User):
        proposal = await self.get_proposal_by_id(proposal_id, user)

        if str(proposal.proposed_to) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the proposal recipient can accept it")
        if proposal.status != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Proposal has already been responded to")

        if not any(ts.start_time == selected_time_slot.start_time and ts.end_time == selected_time_slot.end_time for ts in proposal.proposed_times):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected time slot is not among the proposed times")

        updated_proposal_doc = await self.db.proposals.find_one_and_update(
            {"_id": ObjectId(proposal_id)},
            {
                "$set": {
                    "status": "accepted",
                    "accepted_time_slot": selected_time_slot.model_dump(),
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            return_document=True
        )

        if not updated_proposal_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found after update")

        updated_proposal = models.Proposal(**updated_proposal_doc)

        await self.notification_service.notify_proposal_updated(
            str(updated_proposal.proposed_by),
            {"proposal": updated_proposal.model_dump(), "message": f"Proposal accepted by {user.display_name}"}
        )

        event = await self._create_event_from_proposal(updated_proposal)
        return updated_proposal, event

    async def decline_proposal(self, proposal_id: str, user: models.User):
        proposal = await self.get_proposal_by_id(proposal_id, user)

        if str(proposal.proposed_to) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the proposal recipient can decline it")
        if proposal.status != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Proposal has already been responded to")

        updated_proposal_doc = await self.db.proposals.find_one_and_update(
            {"_id": ObjectId(proposal_id)},
            {"$set": {"status": "declined", "updated_at": datetime.now(timezone.utc)}},
            return_document=True
        )

        if not updated_proposal_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found after update")

        updated_proposal = models.Proposal(**updated_proposal_doc)

        await self.notification_service.notify_proposal_updated(
            str(updated_proposal.proposed_by),
            {"proposal": updated_proposal.model_dump(), "message": f"Proposal declined by {user.display_name}"}
        )
        return updated_proposal

    async def get_proposal_by_id(self, proposal_id: str, user: models.User):
        if not ObjectId.is_valid(proposal_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid proposal ID")
        
        proposal_doc = await self.db.proposals.find_one({"_id": ObjectId(proposal_id)})
        if not proposal_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found")
        
        proposal = models.Proposal(**proposal_doc)
        if str(proposal.proposed_by) != str(user.id) and str(proposal.proposed_to) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this proposal")
            
        return proposal

    async def _create_event_from_proposal(self, proposal: models.Proposal):
        event_dict = {
            "title": proposal.title,
            "description": proposal.description,
            "start_time": proposal.accepted_time_slot.start_time,
            "end_time": proposal.accepted_time_slot.end_time,
            "location": proposal.location,
            "visibility": "shared",
            "attendees": [str(proposal.proposed_by), str(proposal.proposed_to)],
            "created_by": str(proposal.proposed_by),
            "reminders": [10],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        event_result = await self.db.events.insert_one(event_dict)
        created_event_doc = await self.db.events.find_one({"_id": event_result.inserted_id})
        if not created_event_doc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create event from proposal")

        event = models.Event(**created_event_doc)

        await self.notification_service.notify_event_created(str(proposal.proposed_by), event.model_dump(mode='json'))
        await self.notification_service.notify_event_created(str(proposal.proposed_to), event.model_dump(mode='json'))
        
        return event

def get_proposal_service():
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return ProposalService(db, notification_service)

