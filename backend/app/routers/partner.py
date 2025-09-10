from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, Query
from ..models import Partnership, Partner, User, ApiResponse, InviteToken, InviteTokenCreate
from ..auth import get_current_user
from ..database import get_database
from ..websocket import manager, handle_partner_websocket_connection
from bson import ObjectId
from datetime import datetime, timedelta, timezone
import secrets

router = APIRouter(prefix="/partner", tags=["partner"])


@router.post("/generate-invite", response_model=ApiResponse)
async def generate_invite_token(
    invite_data: InviteTokenCreate,
    current_user: User = Depends(get_current_user)
):
    """Generate a unique invite token for sharing"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Generate a secure random token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=invite_data.expires_in_days)

    # Create invite token document
    invite_token_dict = {
        "token": token,
        "created_by": str(current_user.id),
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.now(timezone.utc)
    }

    result = await db.invite_tokens.insert_one(invite_token_dict)

    # Generate the invite URL
    invite_url = f"https://loom.studiodtw.net/invite/{token}"

    return ApiResponse(
        data={
            "invite_token": token,
            "invite_url": invite_url,
            "expires_at": expires_at.isoformat()
        },
        message="Invite link generated successfully"
    )


@router.get("/check-invite/{token}", response_model=ApiResponse)
async def check_invite_token(token: str):
    """Check if an invite token is valid and get inviter info"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Find the invite token
    invite_token = await db.invite_tokens.find_one({
        "token": token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })

    if not invite_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invite token"
        )

    # Get inviter user info
    inviter = await db.users.find_one({"_id": ObjectId(invite_token["created_by"])})
    if not inviter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inviter not found"
        )

    return ApiResponse(
        data={
            "inviter": {
                "id": str(inviter["_id"]),
                "display_name": inviter.get("display_name", "Partner"),
                "email": inviter.get("email")
            },
            "expires_at": invite_token["expires_at"].isoformat(),
            "token": token
        },
        message="Valid invite token"
    )




@router.post("/connect", response_model=ApiResponse)
async def connect_partner(
    token_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Connect with a partner using an invite token"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    token = token_data.get("invite_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite token is required"
        )

    # Reuse the logic from check_invite_token to validate
    invite_token = await db.invite_tokens.find_one({
        "token": token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })

    if not invite_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invite token"
        )

    inviter_id = invite_token["created_by"]

    # Prevent connecting with oneself
    if inviter_id == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot connect with yourself"
        )

    # Check for existing partnership
    existing_partnership = await db.partnerships.find_one({
        "$or": [
            {"user1_id": str(current_user.id), "user2_id": inviter_id, "status": "accepted"},
            {"user1_id": inviter_id, "user2_id": str(current_user.id), "status": "accepted"}
        ]
    })
    if existing_partnership:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already connected with this user"
        )

    # Create partnership
    partnership_dict = {
        "user1_id": inviter_id,
        "user2_id": str(current_user.id),
        "status": "accepted",
        "invited_by": inviter_id,
        "accepted_at": datetime.now(timezone.utc),
        "created_at": invite_token["created_at"]
    }
    await db.partnerships.insert_one(partnership_dict)

    # Mark token as used
    await db.invite_tokens.update_one(
        {"_id": invite_token["_id"]},
        {"$set": {"used": True, "used_by": str(current_user.id)}}
    )

    # Fetch partner data to return
    partner_user = await db.users.find_one({"_id": ObjectId(inviter_id)})
    if not partner_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner user not found"
        )
    partner_data = {
        "id": str(partner_user["_id"]),
        "display_name": partner_user.get("display_name", "Partner"),
        "color_preference": "partner",
        "timezone": partner_user.get("timezone", "UTC"),
        "invite_status": "accepted",
        "connected_at": partnership_dict["accepted_at"]
    }
    partner = Partner(**partner_data)

    # WebSocket notifications
    await manager.notify_partner_connection(inviter_id, str(current_user.id))

    return ApiResponse(data=partner.model_dump(), message="Successfully connected with partner")


@router.get("", response_model=ApiResponse)
async def get_partner(current_user: User = Depends(get_current_user)):
    """Get current user's partner"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Find accepted partnership
    partnership = await db.partnerships.find_one({
        "$or": [
            {"user1_id": str(current_user.id), "status": "accepted"},
            {"user2_id": str(current_user.id), "status": "accepted"}
        ]
    })

    if not partnership:
        return ApiResponse(data=None, message="No active partnership found")

    # Determine partner user ID
    partner_id = (
        partnership["user2_id"]
        if partnership["user1_id"] == str(current_user.id)
        else partnership["user1_id"]
    )

    # Get partner user data
    partner_user = await db.users.find_one({"_id": ObjectId(partner_id)})
    if not partner_user:
        return ApiResponse(data=None, message="Partner user not found")

    partner_data = {
        "id": str(partner_user["_id"]),
        "display_name": partner_user.get("display_name", "Partner"),
        "color_preference": "partner",
        "timezone": partner_user.get("timezone", "UTC"),
        "invite_status": "accepted",
        "connected_at": partnership.get("accepted_at")
    }

    partner = Partner(**partner_data)
    return ApiResponse(data=partner.model_dump(), message="Partner retrieved successfully")


@router.delete("", response_model=ApiResponse)
async def disconnect_partner(current_user: User = Depends(get_current_user)):
    """Disconnect from current partner"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Find accepted partnership
    partnership = await db.partnerships.find_one({
        "$or": [
            {"user1_id": str(current_user.id), "status": "accepted"},
            {"user2_id": str(current_user.id), "status": "accepted"}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active partnership found"
        )

    # Determine partner user ID
    partner_id = (
        partnership["user2_id"]
        if partnership["user1_id"] == str(current_user.id)
        else partnership["user1_id"]
    )

    # Update partnership status to declined
    await db.partnerships.update_one(
        {"_id": partnership["_id"]},
        {"$set": {"status": "declined"}}
    )

    # Get partner user data for notification
    partner_user = await db.users.find_one({"_id": ObjectId(partner_id)})
    if partner_user:
        # Send WebSocket notification to the partner
        await manager.notify_partner_disconnection(partner_id, str(current_user.id))

    return ApiResponse(
        data=None,
        message="Successfully disconnected from partner"
    )


@router.get("/check-email/{email}", response_model=ApiResponse)
async def check_email_registered(email: str):
    """Check if an email is already registered in the system."""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Check if user exists with this email
    user = await db.users.find_one({"email": email})
    is_registered = user is not None

    return ApiResponse(
        data={"is_registered": is_registered, "email": email},
        message="Email registration status checked"
    )

