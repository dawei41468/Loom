from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, status
from bson import ObjectId
import secrets

from ..models import User, Partner, InviteTokenCreate
from ..database import get_database
from ..config import settings
from ..services import notification_service


class PartnerService:
    def __init__(self, db):
        self.db = db

    async def generate_invite_token(self, invite_data: InviteTokenCreate, user: User) -> dict:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=invite_data.expires_in_days)
        invite_token_dict = {
            "token": token,
            "created_by": str(user.id),
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.now(timezone.utc),
        }
        await self.db.invite_tokens.insert_one(invite_token_dict)
        base = settings.FRONTEND_BASE_URL.rstrip('/')
        invite_url = f"{base}/invite/{token}"
        return {"invite_token": token, "invite_url": invite_url, "expires_at": expires_at.isoformat()}

    async def _get_valid_invite(self, token: str) -> dict:
        invite_token = await self.db.invite_tokens.find_one({
            "token": token,
            "used": False,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        })
        if not invite_token:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired invite token")
        return invite_token

    async def check_invite_token(self, token: str) -> dict:
        invite_token = await self._get_valid_invite(token)
        inviter = await self.db.users.find_one({"_id": ObjectId(invite_token["created_by"])})
        if not inviter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inviter not found")
        return {
            "inviter": {
                "id": str(inviter["_id"]),
                "display_name": inviter.get("display_name", "Partner"),
                "email": inviter.get("email"),
            },
            "expires_at": invite_token["expires_at"].isoformat(),
            "token": token,
        }

    async def connect_partner(self, token: str, user: User) -> Partner:
        invite_token = await self._get_valid_invite(token)
        inviter_id = invite_token["created_by"]
        if inviter_id == str(user.id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot connect with yourself")

        existing_partnership = await self.db.partnerships.find_one({
            "$or": [
                {"user1_id": str(user.id), "user2_id": inviter_id, "status": "accepted"},
                {"user1_id": inviter_id, "user2_id": str(user.id), "status": "accepted"},
            ]
        })
        if existing_partnership:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already connected with this user")

        partnership_dict = {
            "user1_id": inviter_id,
            "user2_id": str(user.id),
            "status": "accepted",
            "invited_by": inviter_id,
            "accepted_at": datetime.now(timezone.utc),
            "created_at": invite_token["created_at"],
        }
        await self.db.partnerships.insert_one(partnership_dict)

        await self.db.invite_tokens.update_one(
            {"_id": invite_token["_id"]},
            {"$set": {"used": True, "used_by": str(user.id)}}
        )

        partner_user = await self.db.users.find_one({"_id": ObjectId(inviter_id)})
        if not partner_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner user not found")

        partner = Partner(**{
            "id": str(partner_user["_id"]),
            "display_name": partner_user.get("display_name", "Partner"),
            "color_preference": "partner",
            "timezone": partner_user.get("timezone", "UTC"),
            "invite_status": "accepted",
            "connected_at": partnership_dict["accepted_at"],
        })

        await notification_service.notify_partner_connection(inviter_id, str(user.id))
        return partner

    async def get_partner(self, user: User) -> Optional[Partner]:
        partnership = await self.db.partnerships.find_one({
            "$or": [
                {"user1_id": str(user.id), "status": "accepted"},
                {"user2_id": str(user.id), "status": "accepted"},
            ]
        })
        if not partnership:
            return None
        partner_id = partnership["user2_id"] if partnership["user1_id"] == str(user.id) else partnership["user1_id"]
        partner_user = await self.db.users.find_one({"_id": ObjectId(partner_id)})
        if not partner_user:
            return None
        return Partner(**{
            "id": str(partner_user["_id"]),
            "display_name": partner_user.get("display_name", "Partner"),
            "color_preference": "partner",
            "timezone": partner_user.get("timezone", "UTC"),
            "invite_status": "accepted",
            "connected_at": partnership.get("accepted_at"),
        })

    async def disconnect_partner(self, user: User) -> None:
        partnership = await self.db.partnerships.find_one({
            "$or": [
                {"user1_id": str(user.id), "status": "accepted"},
                {"user2_id": str(user.id), "status": "accepted"},
            ]
        })
        if not partnership:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active partnership found")
        partner_id = partnership["user2_id"] if partnership["user1_id"] == str(user.id) else partnership["user1_id"]
        await self.db.partnerships.update_one({"_id": partnership["_id"]}, {"$set": {"status": "declined"}})
        partner_user = await self.db.users.find_one({"_id": ObjectId(partner_id)})
        if partner_user:
            await notification_service.notify_partner_disconnection(partner_id, str(user.id))

    async def check_email_registered(self, email: str) -> dict:
        user = await self.db.users.find_one({"email": email})
        return {"is_registered": user is not None, "email": email}


def get_partner_service():
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return PartnerService(db)
