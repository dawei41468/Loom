from typing import Optional
from .websocket import manager
from pywebpush import webpush, WebPushException
import json
import logging
from .config import settings


class NotificationService:
    def __init__(self, connection_manager):
        self.manager = connection_manager

    async def notify_partner_disconnection(self, partner_user_id: str, disconnected_by_user: str):
        """Notify partner that they have been disconnected"""
        message = {
            "type": "partner_disconnected",
            "data": {
                "disconnected_by": disconnected_by_user,
                "message": "Your partner has disconnected from you"
            }
        }
        await self.manager.send_notification(partner_user_id, message)

    async def notify_partner_connection(self, partner_user_id: str, connected_by_user: str):
        """Notify partner that a user has connected with them"""
        message = {
            "type": "partner_connected",
            "data": {
                "connected_by": connected_by_user,
                "message": "A user has connected with you"
            }
        }
        await self.manager.send_notification(partner_user_id, message)

    async def notify_proposal_created(self, partner_user_id: str, proposal_data: dict):
        """Notify partner that a new proposal has been created"""
        message = {"type": "proposal_created", "data": proposal_data}
        await self.manager.send_notification(partner_user_id, message)

    async def notify_proposal_updated(self, partner_user_id: str, proposal_data: dict):
        """Notify partner that a proposal has been updated"""
        message = {"type": "proposal_updated", "data": proposal_data}
        await self.manager.send_notification(partner_user_id, message)

    async def notify_event_created(self, partner_user_id: str, event_data: dict):
        """Notify partner that a new event has been created"""
        message = {"type": "event_created", "data": event_data}
        await self.manager.send_notification(partner_user_id, message)

    async def notify_event_deleted(self, partner_user_id: str, event_id: str):
        """Notify partner that an event has been deleted"""
        message = {"type": "event_deleted", "data": {"event_id": event_id}}
        await self.manager.send_notification(partner_user_id, message)


notification_service = NotificationService(manager)


logger = logging.getLogger(__name__)


class PushNotificationService:
    def __init__(self, vapid_subject: str, vapid_public_key: str, vapid_private_key: str):
        self.vapid_subject = vapid_subject
        self.vapid_public_key = vapid_public_key
        self.vapid_private_key = vapid_private_key
    
    async def send_notification(self, subscription: dict, payload: dict) -> bool:
        """
        Send a push notification to a specific subscription
        Returns True if successful, False otherwise
        """
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription["endpoint"],
                    "keys": subscription["keys"]
                },
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims={
                    "sub": self.vapid_subject
                }
            )
            return True
        except WebPushException as e:
            # Handle specific exceptions like expired subscriptions
            if e.response and e.response.status_code == 410:
                # Subscription expired, mark as inactive
                logger.info(f"Subscription expired: {subscription.get('endpoint')}")
            else:
                logger.error(f"Failed to send push notification: {e}")
            return False
    
    async def send_notifications_to_user(self, db, user_id: str, payload: dict, topic: Optional[str] = None) -> int:
        """
        Send notifications to all active subscriptions for a user
        Returns the number of successful sends
        """
        try:
            # Get user's active subscriptions
            query = {"user_id": user_id, "active": True}
            if topic:
                query["topics"] = {"$in": [topic]}
            
            subscriptions = await db.push_subscriptions.find(query).to_list(None)
            
            if not subscriptions:
                logger.info(f"No active subscriptions found for user {user_id}")
                return 0
            
            successful_sends = 0
            for subscription in subscriptions:
                if await self.send_notification(subscription, payload):
                    successful_sends += 1
            
            return successful_sends
        except Exception as e:
            logger.error(f"Error sending notifications to user {user_id}: {e}")
            return 0


# Initialize the service
push_notification_service = PushNotificationService(
    vapid_subject=getattr(settings, "VAPID_SUBJECT", "mailto:admin@loom.com"),
    vapid_public_key=getattr(settings, "VAPID_PUBLIC_KEY", ""),
    vapid_private_key=getattr(settings, "VAPID_PRIVATE_KEY", "")
)

