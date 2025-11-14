from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from ..models import AvailabilitySlot, AvailabilityRequest, User, ApiResponse
from ..auth import get_current_user
from ..database import get_database

router = APIRouter(prefix="/availability", tags=["availability"])


@router.post("/find-overlap", response_model=ApiResponse)
async def find_overlap(
    request: AvailabilityRequest,
    current_user: User = Depends(get_current_user)
):
    """Find available time slots that work for both user and partner"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Calculate date range
    start_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = start_date + timedelta(days=request.date_range_days)
    
    # Get all events for the current user in the date range
    user_events = []
    async for event in db.events.find({
        "$or": [
            {"created_by": str(current_user.id)},
            {"attendees": {"$in": [str(current_user.id)]}}
        ],
        "start_time": {"$gte": start_date, "$lt": end_date}
    }):
        user_events.append({
            "start_time": event["start_time"],
            "end_time": event["end_time"]
        })
    
    # Get partner events (simplified - in real app you'd identify the specific partner)
    partner_events = []
    async for event in db.events.find({
        "created_by": {"$ne": str(current_user.id)},
        "start_time": {"$gte": start_date, "$lt": end_date}
    }):
        # Only include events that are visible to partner
        if event.get("visibility") in ["shared", "title_only"]:
            partner_events.append({
                "start_time": event["start_time"],
                "end_time": event["end_time"]
            })
    
    # Combine all busy times
    all_busy_times = user_events + partner_events
    all_busy_times.sort(key=lambda x: x["start_time"])
    
    # Find available slots
    available_slots = []
    duration_delta = timedelta(minutes=request.duration_minutes)
    
    # Define working hours (9 AM to 6 PM for simplicity)
    for day_offset in range(request.date_range_days):
        current_day = start_date + timedelta(days=day_offset)
        
        # Skip weekends for simplicity (in real app, this would be configurable)
        if current_day.weekday() >= 5:  # Saturday = 5, Sunday = 6
            continue
            
        day_start = current_day.replace(hour=9)  # 9 AM
        day_end = current_day.replace(hour=18)   # 6 PM
        
        # Get busy times for this day
        day_busy_times = [
            event for event in all_busy_times
            if event["start_time"].date() == current_day.date()
        ]
        
        # Find gaps between busy times
        current_time = day_start
        
        for busy_event in day_busy_times:
            busy_start = busy_event["start_time"]
            busy_end = busy_event["end_time"]

            # Ensure busy times are timezone-aware (assume UTC if naive)
            if busy_start.tzinfo is None:
                busy_start = busy_start.replace(tzinfo=timezone.utc)
            if busy_end.tzinfo is None:
                busy_end = busy_end.replace(tzinfo=timezone.utc)

            # If there's a gap before this busy time
            if current_time + duration_delta <= busy_start:
                # Check if the gap is large enough
                gap_end = min(busy_start, day_end)
                if current_time + duration_delta <= gap_end:
                    available_slots.append(AvailabilitySlot(
                        start_time=current_time,
                        end_time=current_time + duration_delta,
                        duration_minutes=request.duration_minutes
                    ))
            
            # Move current time to after this busy period
            current_time = max(current_time, busy_end)
        
        # Check for availability after the last busy time of the day
        if current_time + duration_delta <= day_end:
            available_slots.append(AvailabilitySlot(
                start_time=current_time,
                end_time=current_time + duration_delta,
                duration_minutes=request.duration_minutes
            ))
    
    # Limit to reasonable number of suggestions
    available_slots = available_slots[:10]
    
    # Convert to dict format for response
    slots_data = [slot.model_dump() for slot in available_slots]
    
    return ApiResponse(
        data=slots_data,
        message=f"Found {len(available_slots)} available time slots"
    )


@router.get("/user-busy", response_model=ApiResponse)
async def get_user_busy_times(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    """Get busy times for the current user in a date range"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Get user's events in the date range
    busy_times = []
    async for event in db.events.find({
        "$or": [
            {"created_by": str(current_user.id)},
            {"attendees": {"$in": [str(current_user.id)]}}
        ],
        "start_time": {"$gte": start_date, "$lt": end_date}
    }):
        busy_times.append({
            "start_time": event["start_time"],
            "end_time": event["end_time"],
            "title": event.get("title", "Busy"),
            "visibility": event.get("visibility", "private")
        })
    
    return ApiResponse(
        data=busy_times,
        message=f"Retrieved {len(busy_times)} busy time slots"
    )