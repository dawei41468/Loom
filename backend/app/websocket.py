from typing import Dict, List, Optional
from fastapi import WebSocket, WebSocketDisconnect
import json
import logging

# Import auth function - using absolute import to avoid relative import issues
try:
    from app.auth import get_current_user_ws
except ImportError:
    # Fallback for when running as module
    from .auth import get_current_user_ws

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # event_id -> list of active connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, event_id: str, token: str):
        """Connect a WebSocket to an event room"""
        try:
            # Authenticate the user
            user = await get_current_user_ws(token)
            if not user:
                await websocket.close(code=1008)  # Policy violation
                return

            await websocket.accept()

            if event_id not in self.active_connections:
                self.active_connections[event_id] = []

            self.active_connections[event_id].append(websocket)
            logger.info(f"User {user.id} connected to event {event_id}")

        except Exception as e:
            logger.error(f"Connection error: {e}")
            await websocket.close(code=1011)  # Internal error

    def disconnect(self, websocket: WebSocket, event_id: str):
        """Disconnect a WebSocket from an event room"""
        if event_id in self.active_connections:
            if websocket in self.active_connections[event_id]:
                self.active_connections[event_id].remove(websocket)
                logger.info(f"WebSocket disconnected from event {event_id}")

            # Clean up empty rooms
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]

    async def broadcast_to_event(self, event_id: str, message: dict, exclude_websocket: Optional[WebSocket] = None):
        """Broadcast a message to all connections in an event room"""
        if event_id not in self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections[event_id]:
            if connection == exclude_websocket:
                continue

            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to connection: {e}")
                disconnected.append(connection)

        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn, event_id)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")


# Global connection manager instance
manager = ConnectionManager()


async def handle_websocket_connection(websocket: WebSocket, event_id: str, token: str):
    """Handle WebSocket connection for an event"""
    await manager.connect(websocket, event_id, token)

    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            # For now, we don't handle client messages, just keep alive
            logger.debug(f"Received message from event {event_id}: {data}")

    except WebSocketDisconnect:
        manager.disconnect(websocket, event_id)
    except Exception as e:
        logger.error(f"WebSocket error for event {event_id}: {e}")
        manager.disconnect(websocket, event_id)