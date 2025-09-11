from datetime import datetime, timezone

def serialize_for_json(obj):
    """Recursively convert datetimes to ISO strings to make payload JSON-serializable."""
    if isinstance(obj, datetime):
        # Ensure timezone-aware and serialize
        if obj.tzinfo is None:
            obj = obj.replace(tzinfo=timezone.utc)
        return obj.isoformat().replace('+00:00', 'Z')
    if isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_for_json(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(serialize_for_json(v) for v in obj)
    return obj
