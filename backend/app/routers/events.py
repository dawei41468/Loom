from fastapi import APIRouter, Depends, WebSocket
from bson import ObjectId
from ..models import EventCreate, EventUpdate, User, ApiResponse, EventMessageCreate, ChecklistItemCreate, ChecklistItemUpdate
from ..auth import get_current_user, get_current_user_ws
from ..database import get_database
# Import websocket functions - using absolute import to avoid relative import issues
try:
    from app.websocket import handle_websocket_connection
except ImportError:
    # Fallback for when running as module
    from ..websocket import handle_websocket_connection
 
from ..service_layer.events_service import get_events_service, EventsService
from ..service_layer.event_messages_service import get_event_messages_service, EventMessagesService
from ..service_layer.checklist_service import get_checklist_service, ChecklistService

router = APIRouter(prefix="/events", tags=["events"])


@router.api_route("", methods=["GET"], response_model=ApiResponse)
@router.api_route("/", methods=["GET"], response_model=ApiResponse, include_in_schema=False)
async def get_events(
    current_user: User = Depends(get_current_user),
    events_service: EventsService = Depends(get_events_service),
):
    """Get all events for the current user"""
    events = await events_service.get_events_for_user(current_user)
    return ApiResponse(data=[e.model_dump(mode='json') for e in events], message="Events retrieved successfully")


@router.post("", response_model=ApiResponse)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    events_service: EventsService = Depends(get_events_service),
):
    """Create a new event"""
    event = await events_service.create_event(event_data, current_user)
    return ApiResponse(data=event.model_dump(mode='json'), message="Event created successfully")


@router.get("/{event_id}", response_model=ApiResponse)
async def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    events_service: EventsService = Depends(get_events_service),
):
    """Get a specific event by ID"""
    event = await events_service.get_event_by_id(event_id, current_user)
    return ApiResponse(data=event.model_dump(mode='json'), message="Event retrieved successfully")


@router.put("/{event_id}", response_model=ApiResponse)
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    current_user: User = Depends(get_current_user),
    events_service: EventsService = Depends(get_events_service),
):
    """Update an event"""
    event = await events_service.update_event(event_id, event_update, current_user)
    return ApiResponse(data=event.model_dump(mode='json'), message="Event updated successfully")


@router.delete("/{event_id}", response_model=ApiResponse)
async def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    events_service: EventsService = Depends(get_events_service),
):
    """Delete an event"""
    await events_service.delete_event(event_id, current_user)
    return ApiResponse(message="Event deleted successfully")


# Event Chat Endpoints
@router.get("/{event_id}/messages", response_model=ApiResponse)
async def get_event_messages(
    event_id: str,
    current_user: User = Depends(get_current_user),
    messages_service: EventMessagesService = Depends(get_event_messages_service),
):
    """Get all messages for an event"""
    messages = await messages_service.list_messages(event_id, current_user)
    return ApiResponse(data=[m.model_dump(mode='json') for m in messages], message="Messages retrieved successfully")


@router.post("/{event_id}/messages", response_model=ApiResponse)
async def send_event_message(
    event_id: str,
    message_data: EventMessageCreate,
    current_user: User = Depends(get_current_user),
    messages_service: EventMessagesService = Depends(get_event_messages_service),
):
    """Send a new message to an event"""
    message = await messages_service.send_message(event_id, message_data, current_user)
    return ApiResponse(data=message.model_dump(mode='json'), message="Message sent successfully")


@router.delete("/{event_id}/messages/{message_id}", response_model=ApiResponse)
async def delete_event_message(
    event_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user),
    messages_service: EventMessagesService = Depends(get_event_messages_service),
):
    """Delete a message (owner only)"""
    await messages_service.delete_message(event_id, message_id, current_user)
    return ApiResponse(message="Message deleted successfully")


# Event Checklist Endpoints
@router.get("/{event_id}/checklist", response_model=ApiResponse)
async def get_event_checklist(
    event_id: str,
    current_user: User = Depends(get_current_user),
    checklist_service: ChecklistService = Depends(get_checklist_service),
):
    """Get all checklist items for an event"""
    items = await checklist_service.list_items(event_id, current_user)
    return ApiResponse(data=[i.model_dump(mode='json') for i in items], message="Checklist items retrieved successfully")


@router.post("/{event_id}/checklist", response_model=ApiResponse)
async def create_checklist_item(
    event_id: str,
    item_data: ChecklistItemCreate,
    current_user: User = Depends(get_current_user),
    checklist_service: ChecklistService = Depends(get_checklist_service),
):
    """Create a new checklist item for an event"""
    item = await checklist_service.create_item(event_id, item_data, current_user)
    return ApiResponse(data=item.model_dump(mode='json'), message="Checklist item created successfully")


@router.put("/{event_id}/checklist/{item_id}", response_model=ApiResponse)
async def update_checklist_item(
    event_id: str,
    item_id: str,
    item_update: ChecklistItemUpdate,
    current_user: User = Depends(get_current_user),
    checklist_service: ChecklistService = Depends(get_checklist_service),
):
    """Update a checklist item (toggle completion)"""
    item = await checklist_service.update_item(event_id, item_id, item_update, current_user)
    return ApiResponse(data=item.model_dump(mode='json'), message="Checklist item updated successfully")


@router.delete("/{event_id}/checklist/{item_id}", response_model=ApiResponse)
async def delete_checklist_item(
    event_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    checklist_service: ChecklistService = Depends(get_checklist_service),
):
    """Delete a checklist item"""
    await checklist_service.delete_item(event_id, item_id, current_user)
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

    # Access checks based on raw document to avoid model dependency here
    user_id_str = str(user.id)
    event_attendees = [str(attendee) for attendee in event_doc.get('attendees', [])]
    event_creator = str(event_doc.get('created_by'))

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