from fastapi import APIRouter, WebSocket, Depends
from .. import websocket as ws
from ..auth import get_current_user_ws
from ..models import User

router = APIRouter()

@router.websocket("/partner/ws")
async def partner_websocket(websocket: WebSocket):
    """WebSocket endpoint for partner notifications"""
    await websocket.accept()

    # Extract token from query parameters
    query_params = websocket.query_params
    token = query_params.get('token')

    if not token:
        await websocket.close(code=1008)  # Policy violation
        return

    # Authenticate user
    user = await get_current_user_ws(token)
    if not user:
        await websocket.close(code=4001)  # Custom code for unauthorized
        return

    # Handle the partner WebSocket connection
    await ws.handle_partner_websocket_connection(websocket, user)
