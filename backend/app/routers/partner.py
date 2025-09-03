from fastapi import APIRouter, Depends, HTTPException, status
from ..models import Partnership, PartnershipCreate, Partner, User, ApiResponse
from ..auth import get_current_user
from ..database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/partner", tags=["partner"])


@router.post("/invite", response_model=ApiResponse)
async def invite_partner(
    partnership_data: PartnershipCreate,
    current_user: User = Depends(get_current_user)
):
    """Invite a user to be your partner"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Find the user to invite
    invited_user = await db.users.find_one({"email": partnership_data.invited_user_email})
    if not invited_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with this email"
        )

    if str(invited_user["_id"]) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself"
        )

    # Check if partnership already exists
    existing_partnership = await db.partnerships.find_one({
        "$or": [
            {"user1_id": str(current_user.id), "user2_id": str(invited_user["_id"])},
            {"user1_id": str(invited_user["_id"]), "user2_id": str(current_user.id)}
        ]
    })

    if existing_partnership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Partnership already exists or is pending"
        )

    # Create partnership
    partnership_dict = {
        "user1_id": str(current_user.id),
        "user2_id": str(invited_user["_id"]),
        "status": "pending",
        "invited_by": str(current_user.id),
        "created_at": datetime.utcnow()
    }

    result = await db.partnerships.insert_one(partnership_dict)

    return ApiResponse(
        data={"partnership_id": str(result.inserted_id)},
        message="Partnership invitation sent successfully"
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


@router.post("/accept/{partnership_id}", response_model=ApiResponse)
async def accept_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """Accept a partnership invitation"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    partnership = await db.partnerships.find_one({"_id": ObjectId(partnership_id)})
    if not partnership:
        raise HTTPException(status_code=404, detail="Partnership not found")

    # Verify user is the recipient
    if (partnership["user1_id"] != str(current_user.id) and
        partnership["user2_id"] != str(current_user.id)):
        raise HTTPException(status_code=403, detail="Not authorized")

    if partnership["invited_by"] == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot accept your own invitation")

    # Update partnership
    await db.partnerships.update_one(
        {"_id": ObjectId(partnership_id)},
        {
            "$set": {
                "status": "accepted",
                "accepted_at": datetime.utcnow()
            }
        }
    )

    return ApiResponse(message="Partnership accepted successfully")


@router.post("/decline/{partnership_id}", response_model=ApiResponse)
async def decline_partnership(
    partnership_id: str,
    current_user: User = Depends(get_current_user)
):
    """Decline a partnership invitation"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    partnership = await db.partnerships.find_one({"_id": ObjectId(partnership_id)})
    if not partnership:
        raise HTTPException(status_code=404, detail="Partnership not found")

    # Verify user is the recipient
    if (partnership["user1_id"] != str(current_user.id) and
        partnership["user2_id"] != str(current_user.id)):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Delete partnership (or mark as declined)
    await db.partnerships.delete_one({"_id": ObjectId(partnership_id)})

    return ApiResponse(message="Partnership declined successfully")