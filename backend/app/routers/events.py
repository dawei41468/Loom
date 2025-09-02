from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from ..models import Event, EventCreate, EventUpdate, User, ApiResponse
from ..auth import get_current_user
from ..database import get_database
from datetime import datetime

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=ApiResponse)
async def get_events(current_user: User = Depends(get_current_user)):
    """Get all events for the current user"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Get events where user is either creator or attendee
    events_cursor = db.events.find({
        "$or": [
            {"created_by": str(current_user.id)},
            {"attendees": {"$in": [str(current_user.id)]}}
        ]
    })
    
    events = []
    async for event_doc in events_cursor:
        event = Event(**event_doc)
        events.append(event.dict())
    
    return ApiResponse(data=events, message="Events retrieved successfully")


@router.post("", response_model=ApiResponse)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new event"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Create event document
    event_dict = event_data.dict()
    event_dict["created_by"] = str(current_user.id)
    event_dict["created_at"] = datetime.utcnow()
    event_dict["updated_at"] = datetime.utcnow()
    
    # Ensure current user is in attendees
    if str(current_user.id) not in event_dict["attendees"]:
        event_dict["attendees"].append(str(current_user.id))
    
    # Insert event into database
    result = await db.events.insert_one(event_dict)
    
    # Get the created event
    created_event = await db.events.find_one({"_id": result.inserted_id})
    if not created_event:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create event"
        )
    
    event = Event(**created_event)
    return ApiResponse(data=event.dict(), message="Event created successfully")


@router.get("/{event_id}", response_model=ApiResponse)
async def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific event by ID"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(event_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID"
        )
    
    # Get event
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = Event(**event_doc)
    
    # Check if user has access to this event
    if (str(current_user.id) not in event.attendees and 
        event.created_by != str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this event"
        )
    
    return ApiResponse(data=event.dict(), message="Event retrieved successfully")


@router.put("/{event_id}", response_model=ApiResponse)
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an event"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(event_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID"
        )
    
    # Check if event exists and user has permission
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = Event(**event_doc)
    if event.created_by != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event creator can update this event"
        )
    
    # Update event
    update_data = event_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.events.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update event"
        )
    
    # Get updated event
    updated_event = await db.events.find_one({"_id": ObjectId(event_id)})
    if not updated_event:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated event"
        )
    event = Event(**updated_event)
    
    return ApiResponse(data=event.dict(), message="Event updated successfully")


@router.delete("/{event_id}", response_model=ApiResponse)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an event"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(event_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID"
        )
    
    # Check if event exists and user has permission
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    
    event = Event(**event_doc)
    if event.created_by != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event creator can delete this event"
        )
    
    # Delete event
    result = await db.events.delete_one({"_id": ObjectId(event_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete event"
        )
    
    return ApiResponse(message="Event deleted successfully")