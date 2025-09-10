from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, Query
from bson import ObjectId
from ..models import Event, EventCreate, EventUpdate, User, ApiResponse, EventMessage, EventMessageCreate, ChecklistItem, ChecklistItemCreate, ChecklistItemUpdate
from ..auth import get_current_user, get_current_user_ws
from ..database import get_database
import json
# Import websocket functions - using absolute import to avoid relative import issues
try:
    from app.websocket import manager, handle_websocket_connection
except ImportError:
    # Fallback for when running as module
    from ..websocket import manager, handle_websocket_connection
from datetime import datetime, timezone

router = APIRouter(prefix="/events", tags=["events"])


@router.api_route("", methods=["GET"], response_model=ApiResponse)
@router.api_route("/", methods=["GET"], response_model=ApiResponse, include_in_schema=False)
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
        events.append(event.model_dump())
    
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
    event_dict = event_data.model_dump()
    event_dict["created_by"] = str(current_user.id)
    event_dict["created_at"] = datetime.now(timezone.utc)
    event_dict["updated_at"] = datetime.now(timezone.utc)

    # Ensure current user is in attendees
    if str(current_user.id) not in event_dict["attendees"]:
        event_dict["attendees"].append(str(current_user.id))

    # Find and add partner as attendee if they exist
    partnership = await db.partnerships.find_one({
        "$or": [
            {"user1_id": str(current_user.id), "status": "accepted"},
            {"user2_id": str(current_user.id), "status": "accepted"}
        ]
    })

    partner_id = None
    if partnership:
        # Determine partner user ID
        partner_id = (
            partnership["user2_id"]
            if partnership["user1_id"] == str(current_user.id)
            else partnership["user1_id"]
        )

        # Add partner to attendees if not already present
        if partner_id and partner_id not in event_dict["attendees"]:
            event_dict["attendees"].append(partner_id)

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

    # Notify partner about the new event if they exist
    if partnership and partner_id:
        await manager.notify_event_created(partner_id, event.model_dump())

    return ApiResponse(data=event.model_dump(), message="Event created successfully")


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
    # Convert both sides to strings for consistent comparison
    user_id_str = str(current_user.id)
    if (user_id_str not in [str(attendee) for attendee in event.attendees] and
        str(event.created_by) != user_id_str):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this event"
        )
    
    return ApiResponse(data=event.model_dump(), message="Event retrieved successfully")


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
    if str(event.created_by) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event creator can update this event"
        )
    
    # Update event
    update_data = event_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
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
    
    return ApiResponse(data=event.model_dump(), message="Event updated successfully")


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
    if str(event.created_by) != str(current_user.id):
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
    
    # Notify partner about the event deletion if they exist
    partnership = await db.partnerships.find_one({
        "$or": [
            {"user1_id": str(current_user.id), "status": "accepted"},
            {"user2_id": str(current_user.id), "status": "accepted"}
        ]
    })
    if partnership:
        partner_id = (
            partnership["user2_id"]
            if partnership["user1_id"] == str(current_user.id)
            else partnership["user1_id"]
        )
        await manager.notify_event_deleted(partner_id, event_id)

    return ApiResponse(message="Event deleted successfully")


# Event Chat Endpoints
@router.get("/{event_id}/messages", response_model=ApiResponse)
async def get_event_messages(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all messages for an event"""
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

    # Check if event exists and user has access
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event = Event(**event_doc)
    # Convert both sides to strings for consistent comparison
    user_id_str = str(current_user.id)
    if (user_id_str not in [str(attendee) for attendee in event.attendees] and
        str(event.created_by) != user_id_str):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this event"
        )

    # Get messages for this event
    messages_cursor = db.event_messages.find({"event_id": event_id}).sort("created_at", 1)
    messages = []
    async for message_doc in messages_cursor:
        message = EventMessage(**message_doc)
        messages.append(message.model_dump())

    return ApiResponse(data=messages, message="Messages retrieved successfully")


@router.post("/{event_id}/messages", response_model=ApiResponse)
async def send_event_message(
    event_id: str,
    message_data: EventMessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a new message to an event"""
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

    # Check if event exists and user has access
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event = Event(**event_doc)
    # Convert both sides to strings for consistent comparison
    user_id_str = str(current_user.id)
    if (user_id_str not in [str(attendee) for attendee in event.attendees] and
        str(event.created_by) != user_id_str):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this event"
        )

    # Create message document
    message_dict = message_data.model_dump()
    message_dict["event_id"] = event_id
    message_dict["sender_id"] = str(current_user.id)
    message_dict["created_at"] = datetime.now(timezone.utc)
    message_dict["updated_at"] = datetime.now(timezone.utc)

    # Insert message into database
    result = await db.event_messages.insert_one(message_dict)

    # Get the created message
    created_message = await db.event_messages.find_one({"_id": result.inserted_id})
    if not created_message:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create message"
        )

    message = EventMessage(**created_message)

    # Broadcast the new message to all connected clients in this event
    await manager.broadcast_to_event(event_id, {
        "type": "new_message",
        "data": message.model_dump()
    })

    return ApiResponse(data=message.model_dump(), message="Message sent successfully")


@router.delete("/{event_id}/messages/{message_id}", response_model=ApiResponse)
async def delete_event_message(
    event_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a message (owner only)"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Validate ObjectIds
    if not ObjectId.is_valid(event_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID"
        )
    if not ObjectId.is_valid(message_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID"
        )

    # Check if message exists and user owns it
    message_doc = await db.event_messages.find_one({"_id": ObjectId(message_id), "event_id": event_id})
    if not message_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    message = EventMessage(**message_doc)
    if str(message.sender_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only message sender can delete this message"
        )

    # Delete message
    result = await db.event_messages.delete_one({"_id": ObjectId(message_id)})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete message"
        )

    # Broadcast the message deletion to all connected clients in this event
    await manager.broadcast_to_event(event_id, {
        "type": "delete_message",
        "data": {"message_id": message_id}
    })

    return ApiResponse(message="Message deleted successfully")


# Event Checklist Endpoints
@router.get("/{event_id}/checklist", response_model=ApiResponse)
async def get_event_checklist(
    event_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all checklist items for an event"""
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

    # Check if event exists and user has access
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event = Event(**event_doc)
    # Convert both sides to strings for consistent comparison
    user_id_str = str(current_user.id)
    if (user_id_str not in [str(attendee) for attendee in event.attendees] and
        str(event.created_by) != user_id_str):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this event"
        )

    # Get checklist items for this event
    checklist_cursor = db.event_checklist_items.find({"event_id": event_id}).sort("created_at", 1)
    checklist_items = []
    async for item_doc in checklist_cursor:
        item = ChecklistItem(**item_doc)
        checklist_items.append(item.model_dump())

    return ApiResponse(data=checklist_items, message="Checklist items retrieved successfully")


@router.post("/{event_id}/checklist", response_model=ApiResponse)
async def create_checklist_item(
    event_id: str,
    item_data: ChecklistItemCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new checklist item for an event"""
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

    # Check if event exists and user has access
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event = Event(**event_doc)
    # Convert both sides to strings for consistent comparison
    user_id_str = str(current_user.id)
    if (user_id_str not in [str(attendee) for attendee in event.attendees] and
        str(event.created_by) != user_id_str):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this event"
        )

    # Create checklist item document
    item_dict = item_data.model_dump()
    item_dict["event_id"] = event_id
    item_dict["created_by"] = str(current_user.id)
    item_dict["created_at"] = datetime.now(timezone.utc)
    item_dict["updated_at"] = datetime.now(timezone.utc)

    # Insert item into database
    result = await db.event_checklist_items.insert_one(item_dict)

    # Get the created item
    created_item = await db.event_checklist_items.find_one({"_id": result.inserted_id})
    if not created_item:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checklist item"
        )

    item = ChecklistItem(**created_item)

    # Broadcast the new checklist item to all connected clients in this event
    await manager.broadcast_to_event(event_id, {
        "type": "new_checklist_item",
        "data": item.model_dump()
    })

    return ApiResponse(data=item.model_dump(), message="Checklist item created successfully")


@router.put("/{event_id}/checklist/{item_id}", response_model=ApiResponse)
async def update_checklist_item(
    event_id: str,
    item_id: str,
    item_update: ChecklistItemUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a checklist item (toggle completion)"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Validate ObjectIds
    if not ObjectId.is_valid(event_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID"
        )
    if not ObjectId.is_valid(item_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid item ID"
        )

    # Check if item exists and user has access to the event
    item_doc = await db.event_checklist_items.find_one({"_id": ObjectId(item_id), "event_id": event_id})
    if not item_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found"
        )

    # Check event access
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event = Event(**event_doc)
    # Convert both sides to strings for consistent comparison
    user_id_str = str(current_user.id)
    if (user_id_str not in [str(attendee) for attendee in event.attendees] and
        str(event.created_by) != user_id_str):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this event"
        )

    # Prepare update data
    update_data = item_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)

    # Handle completion tracking
    if "completed" in update_data:
        if update_data["completed"]:
            update_data["completed_by"] = str(current_user.id)
            update_data["completed_at"] = datetime.now(timezone.utc)
        else:
            update_data["completed_by"] = None
            update_data["completed_at"] = None

    # Update item
    result = await db.event_checklist_items.update_one(
        {"_id": ObjectId(item_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update checklist item"
        )

    # Get updated item
    updated_item = await db.event_checklist_items.find_one({"_id": ObjectId(item_id)})
    if not updated_item:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated checklist item"
        )

    item = ChecklistItem(**updated_item)

    # Broadcast the checklist item update to all connected clients in this event
    await manager.broadcast_to_event(event_id, {
        "type": "update_checklist_item",
        "data": item.model_dump()
    })

    return ApiResponse(data=item.model_dump(), message="Checklist item updated successfully")


@router.delete("/{event_id}/checklist/{item_id}", response_model=ApiResponse)
async def delete_checklist_item(
    event_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a checklist item"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Validate ObjectIds
    if not ObjectId.is_valid(event_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event ID"
        )
    if not ObjectId.is_valid(item_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid item ID"
        )

    # Check if item exists and user has access
    item_doc = await db.event_checklist_items.find_one({"_id": ObjectId(item_id), "event_id": event_id})
    if not item_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checklist item not found"
        )

    item = ChecklistItem(**item_doc)

    # Check event access
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    event = Event(**event_doc)
    # Convert both sides to strings for consistent comparison
    user_id_str = str(current_user.id)
    if (user_id_str not in [str(attendee) for attendee in event.attendees] and
        str(event.created_by) != user_id_str):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this event"
        )

    # Only creator can delete
    if str(item.created_by) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only item creator can delete this checklist item"
        )

    # Delete item
    result = await db.event_checklist_items.delete_one({"_id": ObjectId(item_id)})

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete checklist item"
        )

    # Broadcast the checklist item deletion to all connected clients in this event
    await manager.broadcast_to_event(event_id, {
        "type": "delete_checklist_item",
        "data": {"item_id": item_id}
    })

    return ApiResponse(message="Checklist item deleted successfully")


# WebSocket endpoint for real-time event updates
@router.websocket("/{event_id}/ws")
async def event_websocket(
    websocket: WebSocket,
    event_id: str
):
    """WebSocket endpoint for real-time event updates"""
    import logging
    logger = logging.getLogger(__name__)

    logger.info(f"WebSocket connection attempt for event {event_id}")

    # Extract token from query parameters (consistent with partner WebSocket)
    query_params = websocket.query_params
    token = query_params.get('token')

    logger.info(f"Token extracted: {'present' if token else 'missing'}")
    logger.info(f"Query params: {dict(query_params)}")

    if not token:
        logger.error("No token provided in WebSocket connection")
        await websocket.close(code=1008)  # Policy violation
        return

    # Authenticate user
    logger.info("Attempting WebSocket user authentication...")
    user = await get_current_user_ws(token)
    if not user:
        logger.error("WebSocket user authentication failed")
        await websocket.close(code=4001)  # Custom code for unauthorized
        return

    logger.info(f"WebSocket user authenticated: {user.id}")

    # Validate ObjectId
    if not ObjectId.is_valid(event_id):
        await websocket.close(code=1003)  # Unsupported data
        return

    # Check if event exists and user has access
    logger.info("Checking database connection for event lookup...")
    db = get_database()
    if db is None:
        logger.error("Database connection not available for WebSocket")
        await websocket.close(code=1011)  # Internal error
        return

    logger.info(f"Looking up event: {event_id}")
    event_doc = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event_doc:
        logger.error(f"Event not found: {event_id}")
        await websocket.close(code=1003)  # Event not found
        return

    logger.info(f"Event found: {event_doc.get('title', 'unknown')}")
    event = Event(**event_doc)

    # Convert both sides to strings for consistent comparison
    user_id_str = str(user.id)
    event_attendees = [str(attendee) for attendee in event.attendees]
    event_creator = str(event.created_by)

    logger.info(f"User ID: {user_id_str}")
    logger.info(f"Event attendees: {event_attendees}")
    logger.info(f"Event creator: {event_creator}")

    is_attendee = user_id_str in event_attendees
    is_creator = event_creator == user_id_str

    logger.info(f"Is attendee: {is_attendee}")
    logger.info(f"Is creator: {is_creator}")

    if not (is_attendee or is_creator):
        logger.error(f"Access denied: user {user_id_str} is not attendee or creator of event {event_id}")
        await websocket.close(code=4003)  # Custom code for forbidden
        return

    logger.info("Event access granted, proceeding with WebSocket connection")

    # Accept the WebSocket connection before handling it
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    # Handle the WebSocket connection
    await handle_websocket_connection(websocket, event_id, user)