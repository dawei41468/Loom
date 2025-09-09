from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from ..models import Proposal, ProposalCreate, User, ApiResponse, Event, TimeSlot
from ..auth import get_current_user
from ..database import get_database
from ..websocket import manager
from datetime import datetime

router = APIRouter(prefix="/proposals", tags=["proposals"])


@router.get("", response_model=ApiResponse)
async def get_proposals(current_user: User = Depends(get_current_user)):
    """Get all proposals for the current user (sent and received)"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Get proposals where user is either proposer or recipient
    proposals_cursor = db.proposals.find({
        "$or": [
            {"proposed_by": str(current_user.id)},
            {"proposed_to": str(current_user.id)}
        ]
    })
    
    proposals = []
    async for proposal_doc in proposals_cursor:
        proposal = Proposal(**proposal_doc)
        proposals.append(proposal.dict())
    
    return ApiResponse(data=proposals, message="Proposals retrieved successfully")


@router.post("", response_model=ApiResponse)
async def create_proposal(
    proposal_data: ProposalCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new proposal"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate that proposed_to is not the same as current user
    if str(proposal_data.proposed_to) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot propose to yourself"
        )
    
    # Check if proposed_to user exists
    proposed_to_user = await db.users.find_one({"_id": ObjectId(proposal_data.proposed_to)})
    if not proposed_to_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposed recipient not found"
        )
    
    # Create proposal document
    proposal_dict = proposal_data.dict()
    proposal_dict["proposed_by"] = str(current_user.id)
    proposal_dict["status"] = "pending"
    proposal_dict["created_at"] = datetime.utcnow()
    proposal_dict["updated_at"] = datetime.utcnow()
    
    # Insert proposal into database
    result = await db.proposals.insert_one(proposal_dict)
    
    # Get the created proposal
    created_proposal = await db.proposals.find_one({"_id": result.inserted_id})
    if not created_proposal:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create proposal"
        )
    
    proposal = Proposal(**created_proposal)

    # Notify the partner about the new proposal via WebSocket
    try:
        await manager.notify_proposal_created(
            str(proposal_data.proposed_to),
            {
                "proposal": proposal.dict(),
                "message": f"New proposal from {current_user.display_name}"
            }
        )
    except Exception as e:
        # Log the error but don't fail the request
        print(f"Failed to send WebSocket notification: {e}")

    return ApiResponse(data=proposal.dict(), message="Proposal created successfully")


@router.post("/{proposal_id}/accept", response_model=ApiResponse)
async def accept_proposal(
    proposal_id: str,
    selected_time_slot: TimeSlot,
    current_user: User = Depends(get_current_user)
):
    """Accept a proposal and create an event"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(proposal_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid proposal ID"
        )
    
    # Get proposal
    proposal_doc = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )
    
    proposal = Proposal(**proposal_doc)
    
    # Check if current user is the recipient
    if str(proposal.proposed_to) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the proposal recipient can accept it"
        )
    
    # Check if proposal is still pending
    if proposal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Proposal has already been responded to"
        )
    
    # Validate that selected time slot is one of the proposed times
    time_slot_dict = selected_time_slot.dict()
    valid_slot = False
    for proposed_time in proposal.proposed_times:
        if (proposed_time.start_time == selected_time_slot.start_time and 
            proposed_time.end_time == selected_time_slot.end_time):
            valid_slot = True
            break
    
    if not valid_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected time slot is not among the proposed times"
        )
    
    # Update proposal status
    await db.proposals.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "status": "accepted",
                "accepted_time_slot": time_slot_dict,
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Notify the proposal creator about the acceptance
    try:
        updated_proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
        if updated_proposal:
            proposal_obj = Proposal(**updated_proposal)
            await manager.notify_proposal_updated(
                str(proposal.proposed_by),
                {
                    "proposal": proposal_obj.dict(),
                    "message": f"Proposal accepted by {current_user.display_name}"
                }
            )
    except Exception as e:
        print(f"Failed to send WebSocket notification for proposal acceptance: {e}")
    
    # Create event from accepted proposal
    event_dict = {
        "title": proposal.title,
        "description": proposal.description,
        "start_time": selected_time_slot.start_time,
        "end_time": selected_time_slot.end_time,
        "location": proposal.location,
        "visibility": "shared",
        "attendees": [proposal.proposed_by, proposal.proposed_to],
        "created_by": proposal.proposed_by,
        "reminders": [10],  # Default 10 minute reminder
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    event_result = await db.events.insert_one(event_dict)
    created_event = await db.events.find_one({"_id": event_result.inserted_id})
    
    if not created_event:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create event from proposal"
        )
    
    # Get updated proposal
    updated_proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not updated_proposal:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated proposal"
        )
    
    proposal = Proposal(**updated_proposal)
    event = Event(**created_event)
    
    return ApiResponse(
        data={
            "proposal": proposal.dict(),
            "event": event.dict()
        },
        message="Proposal accepted and event created successfully"
    )


@router.post("/{proposal_id}/decline", response_model=ApiResponse)
async def decline_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user)
):
    """Decline a proposal"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(proposal_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid proposal ID"
        )
    
    # Get proposal
    proposal_doc = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )
    
    proposal = Proposal(**proposal_doc)
    
    # Check if current user is the recipient
    if str(proposal.proposed_to) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the proposal recipient can decline it"
        )
    
    # Check if proposal is still pending
    if proposal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Proposal has already been responded to"
        )
    
    # Update proposal status
    result = await db.proposals.update_one(
        {"_id": ObjectId(proposal_id)},
        {
            "$set": {
                "status": "declined",
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Notify the proposal creator about the decline
    try:
        updated_proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
        if updated_proposal:
            proposal_obj = Proposal(**updated_proposal)
            await manager.notify_proposal_updated(
                str(proposal.proposed_by),
                {
                    "proposal": proposal_obj.dict(),
                    "message": f"Proposal declined by {current_user.display_name}"
                }
            )
    except Exception as e:
        print(f"Failed to send WebSocket notification for proposal decline: {e}")
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decline proposal"
        )
    
    # Get updated proposal
    updated_proposal = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not updated_proposal:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated proposal"
        )
    
    proposal = Proposal(**updated_proposal)
    return ApiResponse(data=proposal.dict(), message="Proposal declined successfully")


@router.get("/{proposal_id}", response_model=ApiResponse)
async def get_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific proposal by ID"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(proposal_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid proposal ID"
        )
    
    # Get proposal
    proposal_doc = await db.proposals.find_one({"_id": ObjectId(proposal_id)})
    if not proposal_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )
    
    proposal = Proposal(**proposal_doc)
    
    # Check if user has access to this proposal
    if (str(proposal.proposed_by) != str(current_user.id) and
        str(proposal.proposed_to) != str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this proposal"
        )
    
    return ApiResponse(data=proposal.dict(), message="Proposal retrieved successfully")