from .websocket import manager


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

