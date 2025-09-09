from typing import Dict, List, Optional, Set, Deque, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
import logging
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict, deque
import weakref

# Import auth function - using absolute import to avoid relative import issues
try:
    from app.config import settings
    from app.models import User
except ImportError:
    # Fallback for when running as module
    from .config import settings
    from .models import User

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # event_id -> list of active connections with metadata
        self.active_connections: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        # user_id -> websocket for partner notifications with metadata
        self.partner_connections: Dict[str, Dict[str, Any]] = {}

        # Connection tracking
        self.user_connection_counts: Dict[str, int] = defaultdict(int)
        self.room_connection_counts: Dict[str, int] = defaultdict(int)

        # Message queues for offline users
        self.message_queues: Dict[str, Deque[Dict]] = defaultdict(lambda: deque(maxlen=settings.WS_MESSAGE_QUEUE_SIZE))

        # Heartbeat tracking
        self.heartbeat_tasks: Dict[str, asyncio.Task] = {}
        self.last_heartbeat: Dict[str, datetime] = {}

        # Shutdown flag
        self.shutting_down = False

        logger.info("WebSocket ConnectionManager initialized")

    async def connect(self, websocket: WebSocket, event_id: str, user: User) -> bool:
        """Connect a WebSocket to an event room"""
        try:
            # User is pre-authenticated by the endpoint
            logger.info(f"Connecting user {user.id} to event {event_id}")

            # Check connection limits
            if self.user_connection_counts[str(user.id)] >= settings.WS_MAX_CONNECTIONS_PER_USER:
                logger.warning(f"User {user.id} exceeded max connections ({settings.WS_MAX_CONNECTIONS_PER_USER})")
                await websocket.close(code=1008)  # Policy violation
                return False

            if self.room_connection_counts[event_id] >= settings.WS_MAX_CONNECTIONS_PER_ROOM:
                logger.warning(f"Room {event_id} exceeded max connections ({settings.WS_MAX_CONNECTIONS_PER_ROOM})")
                await websocket.close(code=1008)  # Policy violation
                return False

            logger.info(f"WebSocket authentication successful for user {user.id}, event {event_id}")

            # Create connection metadata
            connection_info = {
                'websocket': websocket,
                'user_id': str(user.id),
                'event_id': event_id,
                'connected_at': datetime.utcnow(),
                'last_activity': datetime.utcnow()
            }

            self.active_connections[event_id].append(connection_info)
            self.user_connection_counts[str(user.id)] += 1
            self.room_connection_counts[event_id] += 1

            # Start heartbeat for this connection
            await self._start_heartbeat(websocket, str(user.id), event_id)

            # Send any queued messages
            await self.send_queued_messages(str(user.id), websocket)

            logger.info(f"User {user.id} connected to event {event_id}. Total connections: user={self.user_connection_counts[str(user.id)]}, room={self.room_connection_counts[event_id]}")
            return True

        except Exception as e:
            logger.error(f"Connection error for user {user.id} in event {event_id}: {e}")
            await websocket.close(code=1011)  # Internal error
            return False

    async def disconnect(self, websocket: WebSocket, event_id: str):
        """Disconnect a WebSocket from an event room"""
        if event_id in self.active_connections:
            # Find and remove the connection
            for i, conn_info in enumerate(self.active_connections[event_id]):
                if conn_info['websocket'] == websocket:
                    user_id = conn_info['user_id']
                    self.active_connections[event_id].pop(i)
                    self.user_connection_counts[user_id] -= 1
                    self.room_connection_counts[event_id] -= 1

                    # Stop heartbeat
                    await self._stop_heartbeat(user_id, event_id)

                    logger.info(f"WebSocket disconnected from event {event_id} for user {user_id}")
                    break

            # Clean up empty rooms
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]
                del self.room_connection_counts[event_id]

    async def broadcast_to_event(self, event_id: str, message: dict, exclude_websocket: Optional[WebSocket] = None):
        """Broadcast a message to all connections in an event room"""
        if event_id not in self.active_connections:
            return

        disconnected = []
        for conn_info in self.active_connections[event_id]:
            websocket = conn_info['websocket']
            user_id = conn_info['user_id']

            if websocket == exclude_websocket:
                continue

            try:
                await websocket.send_json(message)
                conn_info['last_activity'] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Failed to send message to user {user_id} in event {event_id}: {e}")
                disconnected.append(websocket)

        # Clean up disconnected connections
        for ws in disconnected:
            await self.disconnect(ws, event_id)

    async def connect_partner(self, websocket: WebSocket, user: User) -> bool:
        """Connect a WebSocket for partner notifications"""
        user_id = str(user.id)
        try:
            # User is pre-authenticated by the endpoint
            logger.info(f"Connecting user {user_id} for partner notifications")

            # Check connection limit
            if self.user_connection_counts[user_id] >= settings.WS_MAX_CONNECTIONS_PER_USER:
                logger.warning(f"User {user_id} exceeded max connections ({settings.WS_MAX_CONNECTIONS_PER_USER})")
                await websocket.close(code=1008)  # Policy violation
                return False

            # Create connection metadata
            connection_info = {
                'websocket': websocket,
                'user_id': user_id,
                'connected_at': datetime.utcnow(),
                'last_activity': datetime.utcnow()
            }

            self.partner_connections[user_id] = connection_info
            self.user_connection_counts[user_id] += 1

            # Start heartbeat for this connection
            await self._start_heartbeat(websocket, user_id, 'partner')

            # Send any queued messages
            await self.send_queued_messages(user_id, websocket)

            logger.info(f"User {user_id} connected for partner notifications")
            return True

        except Exception as e:
            logger.error(f"Partner connection error for user {user_id}: {e}")
            await websocket.close(code=1011)  # Internal error
            return False

    async def disconnect_partner(self, user_id: str):
        """Disconnect partner WebSocket"""
        if user_id in self.partner_connections:
            self.user_connection_counts[user_id] -= 1
            # Stop heartbeat
            await self._stop_heartbeat(user_id, 'partner')
            del self.partner_connections[user_id]
            logger.info(f"Partner WebSocket disconnected for user {user_id}")

    async def _send_notification(self, user_id: str, message: dict):
        """Send a notification to a specific user, queuing if offline."""
        if user_id in self.partner_connections:
            try:
                websocket = self.partner_connections[user_id]['websocket']
                await websocket.send_json(message)
                self.partner_connections[user_id]['last_activity'] = datetime.utcnow()
                logger.info(f"Sent '{message.get('type')}' notification to user {user_id}")
            except Exception as e:
                logger.error(f"Failed to send notification to user {user_id}: {e}")
                await self.disconnect_partner(user_id)
                self.queue_message_for_user(user_id, message)
        else:
            self.queue_message_for_user(user_id, message)

    async def notify_partner_disconnection(self, partner_user_id: str, disconnected_by_user: str):
        """Notify partner that they have been disconnected"""
        message = {
            "type": "partner_disconnected",
            "data": {
                "disconnected_by": disconnected_by_user,
                "message": "Your partner has disconnected from you"
            }
        }
        await self._send_notification(partner_user_id, message)

    async def notify_partner_connection(self, partner_user_id: str, connected_by_user: str):
        """Notify partner that a user has connected with them"""
        message = {
            "type": "partner_connected",
            "data": {
                "connected_by": connected_by_user,
                "message": "A user has connected with you"
            }
        }
        await self._send_notification(partner_user_id, message)

    async def notify_proposal_created(self, partner_user_id: str, proposal_data: dict):
        """Notify partner that a new proposal has been created"""
        message = {"type": "proposal_created", "data": proposal_data}
        await self._send_notification(partner_user_id, message)

    async def notify_proposal_updated(self, partner_user_id: str, proposal_data: dict):
        """Notify partner that a proposal has been updated"""
        message = {"type": "proposal_updated", "data": proposal_data}
        await self._send_notification(partner_user_id, message)

    async def notify_event_created(self, partner_user_id: str, event_data: dict):
        """Notify partner that a new event has been created"""
        message = {"type": "event_created", "data": event_data}
        await self._send_notification(partner_user_id, message)

    async def notify_event_deleted(self, partner_user_id: str, event_id: str):
        """Notify partner that an event has been deleted"""
        message = {"type": "event_deleted", "data": {"event_id": event_id}}
        await self._send_notification(partner_user_id, message)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")

    def queue_message_for_user(self, user_id: str, message: dict):
        """Queue a message for a user when they are offline"""
        if len(self.message_queues[user_id]) < settings.WS_MESSAGE_QUEUE_SIZE:
            self.message_queues[user_id].append(message)
            logger.debug(f"Queued message for offline user {user_id}")
        else:
            logger.warning(f"Message queue full for user {user_id}, dropping message")

    async def send_queued_messages(self, user_id: str, websocket: WebSocket):
        """Send queued messages to a user when they reconnect"""
        if user_id in self.message_queues and self.message_queues[user_id]:
            messages_to_send = list(self.message_queues[user_id])
            self.message_queues[user_id].clear()

            for message in messages_to_send:
                try:
                    await websocket.send_json(message)
                    logger.debug(f"Sent queued message to user {user_id}")
                except Exception as e:
                    logger.error(f"Failed to send queued message to user {user_id}: {e}")
                    # Re-queue the message if sending failed
                    self.queue_message_for_user(user_id, message)

    async def _start_heartbeat(self, websocket: WebSocket, user_id: str, room_id: str):
        """Start heartbeat monitoring for a connection"""
        if self.shutting_down:
            return

        task_key = f"{user_id}:{room_id}"
        if task_key in self.heartbeat_tasks:
            self.heartbeat_tasks[task_key].cancel()

        async def heartbeat_loop():
            try:
                while not self.shutting_down:
                    await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
                    try:
                        # Send ping
                        await asyncio.wait_for(
                            websocket.send_json({"type": "ping", "timestamp": datetime.utcnow().isoformat()}),
                            timeout=settings.WS_PING_TIMEOUT
                        )
                        self.last_heartbeat[task_key] = datetime.utcnow()
                    except asyncio.TimeoutError:
                        logger.warning(f"Heartbeat ping timeout for user {user_id} in {room_id}")
                        # Connection is likely dead, disconnect
                        try:
                            await websocket.close(code=1008)
                        except Exception:
                            pass  # Connection might already be closed
                        break
                    except Exception as e:
                        logger.error(f"Heartbeat error for user {user_id} in {room_id}: {e}")
                        try:
                            await websocket.close(code=1008)
                        except Exception:
                            pass  # Connection might already be closed
                        break
            except asyncio.CancelledError:
                pass
            finally:
                if task_key in self.heartbeat_tasks:
                    del self.heartbeat_tasks[task_key]
                if task_key in self.last_heartbeat:
                    del self.last_heartbeat[task_key]

        task = asyncio.create_task(heartbeat_loop())
        self.heartbeat_tasks[task_key] = task

    async def _stop_heartbeat(self, user_id: str, room_id: str):
        """Stop heartbeat monitoring for a connection"""
        task_key = f"{user_id}:{room_id}"
        if task_key in self.heartbeat_tasks:
            task = self.heartbeat_tasks.pop(task_key)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass  # Expected
        if task_key in self.last_heartbeat:
            del self.last_heartbeat[task_key]

    async def shutdown(self):
        """Gracefully shutdown the connection manager"""
        logger.info("Shutting down WebSocket ConnectionManager...")
        self.shutting_down = True

        # Cancel all heartbeat tasks
        for task in self.heartbeat_tasks.values():
            task.cancel()

        # Close all connections
        for room_connections in self.active_connections.values():
            for conn_info in room_connections:
                try:
                    await conn_info['websocket'].close(code=1001)  # Going away
                except Exception as e:
                    logger.error(f"Error closing connection: {e}")

        for conn_info in self.partner_connections.values():
            try:
                await conn_info['websocket'].close(code=1001)  # Going away
            except Exception as e:
                logger.error(f"Error closing partner connection: {e}")

        # Clear all data structures
        self.active_connections.clear()
        self.partner_connections.clear()
        self.user_connection_counts.clear()
        self.room_connection_counts.clear()
        self.message_queues.clear()
        self.heartbeat_tasks.clear()
        self.last_heartbeat.clear()

        logger.info("WebSocket ConnectionManager shutdown complete")


# Global connection manager instance
manager = ConnectionManager()


async def handle_websocket_connection(websocket: WebSocket, event_id: str, user: User):
    """Handle WebSocket connection for an event"""
    connection_successful = await manager.connect(websocket, event_id, user)

    # Only proceed with message handling if connection was successful
    if not connection_successful:
        return

    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                if message.get('type') == 'ping':
                    # Respond with pong
                    await websocket.send_json({"type": "pong", "timestamp": message.get('timestamp')})
                elif message.get('type') == 'pong':
                    # Update last activity on pong
                    for conn_info in manager.active_connections.get(event_id, []):
                        if conn_info['websocket'] == websocket:
                            conn_info['last_activity'] = datetime.utcnow()
                            break
                else:
                    logger.debug(f"Received message from event {event_id}: {data}")
            except json.JSONDecodeError:
                logger.debug(f"Received non-JSON message from event {event_id}: {data}")
    except WebSocketDisconnect:
        # Expected when client disconnects
        pass
    except Exception as e:
        logger.error(f"WebSocket error for event {event_id}: {e}")
    finally:
        await manager.disconnect(websocket, event_id)


async def handle_partner_websocket_connection(websocket: WebSocket, user: User):
    """Handle WebSocket connection for partner notifications"""
    user_id = str(user.id)
    connection_successful = await manager.connect_partner(websocket, user)

    # Only proceed with message handling if connection was successful
    if not connection_successful:
        return

    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                if message.get('type') == 'ping':
                    # Respond with pong
                    await websocket.send_json({"type": "pong", "timestamp": message.get('timestamp')})
                elif message.get('type') == 'pong':
                    # Update last activity on pong
                    if user_id in manager.partner_connections:
                        manager.partner_connections[user_id]['last_activity'] = datetime.utcnow()
                else:
                    logger.debug(f"Received message from partner {user_id}: {data}")
            except json.JSONDecodeError:
                logger.debug(f"Received non-JSON message from partner {user_id}: {data}")
    except WebSocketDisconnect:
        # Expected when client disconnects
        pass
    except Exception as e:
        logger.error(f"Partner WebSocket error for user {user_id}: {e}")
    finally:
        await manager.disconnect_partner(user_id)