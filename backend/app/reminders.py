import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from bson import ObjectId

from .config import settings

# Background task reference
_reminders_task: Optional[asyncio.Task] = None


async def _should_send_reminder(now: datetime, event_start: datetime, reminders: List[int], window_seconds: int = 60) -> Optional[int]:
    """
    Determine if a reminder should be sent now for any of the configured reminder minutes.
    Returns the matching minutes value if a reminder should be sent, otherwise None.
    """
    # Ensure timezone-aware UTC datetimes
    if event_start.tzinfo is None:
        event_start = event_start.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    delta_seconds = (event_start - now).total_seconds()

    for m in reminders or []:
        target_seconds = m * 60
        if 0 <= (delta_seconds - target_seconds) < window_seconds:
            return m
    return None


async def _send_reminder_for_event(db, user_id: str, event_doc: dict, minutes: int):
    """
    Send a reminder to a single user for the given event if not already sent (deduped by dedupe_key).
    """
    event_id = str(event_doc.get("_id"))
    dedupe_key = f"reminders:event:{event_id}:{minutes}"

    # Check if we already logged this reminder for this user
    existing = await db.notification_events.find_one({
        "user_id": ObjectId(user_id),
        "dedupe_key": dedupe_key,
        "type": "reminders",
    })
    if existing:
        return

    # Compose payload
    title = "Event Reminder"
    start_time = event_doc.get("start_time")
    try:
        def parse_dt(val):
            if isinstance(val, datetime):
                return val
            if isinstance(val, str):
                # Handle 'Z' suffix and ensure fromisoformat compatibility
                return datetime.fromisoformat(val.replace('Z', '+00:00'))
            return None
        start_dt = parse_dt(start_time)
        if start_dt is None:
            time_str = "soon"
        else:
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            time_str = start_dt.astimezone(timezone.utc).strftime("%H:%M UTC")
    except Exception:
        time_str = "soon"

    payload = {
        "title": title,
        "body": f"{event_doc.get('title', 'Your event')} starts at {time_str}",
        "data": {
            "type": "reminder",
            "event_id": event_id,
            "minutes": minutes,
        },
    }

    # Log notification event (minimal)
    await db.notification_events.insert_one({
        "user_id": ObjectId(user_id),
        "type": "reminders",
        "subtype": f"{minutes}m",
        "entity_ref": {"event_id": event_id},
        "payload_summary": payload.get("body"),
        "dedupe_key": dedupe_key,
        "created_at": datetime.utcnow(),
        "delivery_status": [],
    })


async def reminders_loop(db):
    """
    Periodically scan upcoming events and send reminders based on Event.reminders values.
    Runs every ~30 seconds. Gated by FEATURE_PUSH_NOTIFICATIONS.
    """
    if not getattr(settings, "FEATURE_PUSH_NOTIFICATIONS", False):
        return

    poll_interval = 30  # seconds
    lookahead = timedelta(hours=2)
    window_seconds = 60  # consider reminders due within this window

    while True:
        try:
            now = datetime.utcnow().replace(tzinfo=timezone.utc)

            # Find events starting within lookahead that have reminders configured
            cursor = db.events.find({
                "start_time": {"$gte": now, "$lte": now + lookahead},
                "reminders": {"$exists": True, "$ne": []},
            })
            events = [doc async for doc in cursor]

            for event in events:
                reminders = event.get("reminders", [])
                start_time = event.get("start_time")
                # Normalize event_start to datetime
                try:
                    if isinstance(start_time, datetime):
                        event_start = start_time
                    elif isinstance(start_time, str):
                        event_start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    else:
                        continue
                except Exception:
                    continue
                minutes = await _should_send_reminder(now, event_start, reminders, window_seconds)
                if minutes is None:
                    continue

                attendees = [str(a) for a in (event.get("attendees") or [])]
                for uid in attendees:
                    await _send_reminder_for_event(db, uid, event, minutes)
        except Exception as e:
            # Log and continue
            import logging
            logging.getLogger(__name__).error(f"Reminders loop error: {e}")
        finally:
            await asyncio.sleep(poll_interval)


def start_reminders_loop(db):
    global _reminders_task
    if _reminders_task is None or _reminders_task.done():
        _reminders_task = asyncio.create_task(reminders_loop(db))


def stop_reminders_loop():
    global _reminders_task
    if _reminders_task and not _reminders_task.done():
        _reminders_task.cancel()
        _reminders_task = None
