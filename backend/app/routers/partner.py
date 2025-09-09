from fastapi import APIRouter, Depends, HTTPException, status
from ..models import Partnership, Partner, User, ApiResponse, InviteToken, InviteTokenCreate
from ..auth import get_current_user
from ..database import get_database
from bson import ObjectId
from datetime import datetime, timedelta
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
    expires_at = datetime.utcnow() + timedelta(days=invite_data.expires_in_days)

    # Create invite token document
    invite_token_dict = {
        "token": token,
        "created_by": str(current_user.id),
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.utcnow()
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
        "expires_at": {"$gt": datetime.utcnow()}
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
    return ApiResponse(data=partner.dict(), message="Partner retrieved successfully")


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