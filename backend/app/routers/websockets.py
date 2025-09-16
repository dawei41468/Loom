from fastapi import APIRouter, WebSocket
from .. import websocket as ws
from ..auth import get_current_user_ws

router = APIRouter()

@router.websocket("/partner/ws")
async def partner_websocket(websocket: WebSocket):
    """WebSocket endpoint for partner notifications"""
    # Extract token from query parameters
    query_params = websocket.query_params
    token = query_params.get('token')

    if not token:
        # No token provided
        await websocket.close(code=1008)  # Policy violation
        return

    # Authenticate user
    user = await get_current_user_ws(token)
    if not user:
        await websocket.close(code=4001)  # Custom code for unauthorized
        return

    # Accept only after successful authentication
    await websocket.accept()

    # Handle the partner WebSocket connection
    await ws.handle_partner_websocket_connection(websocket, user)
