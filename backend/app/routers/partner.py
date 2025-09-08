from fastapi import APIRouter, Depends, HTTPException, status
from ..models import Partnership, PartnershipCreate, Partner, User, ApiResponse
from ..auth import get_current_user
from ..database import get_database
from ..email import send_partnership_invitation
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

    # Check if trying to invite yourself
    if partnership_data.invited_user_email == current_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself"
        )

    # Check if partnership already exists (regardless of whether invited user exists)
    # We need to check both by user ID (if user exists) and by email
    invited_user = await db.users.find_one({"email": partnership_data.invited_user_email})
    
    partnership_query = {
        "invited_by": str(current_user.id),
        "invited_email": partnership_data.invited_user_email,
        "status": {"$in": ["pending", "accepted"]}
    }
    
    # Also check if there's an existing partnership with the user ID if they exist
    if invited_user:
        partnership_query = {
            "$or": [
                partnership_query,
                {
                    "$or": [
                        {"user1_id": str(current_user.id), "user2_id": str(invited_user["_id"])},
                        {"user1_id": str(invited_user["_id"]), "user2_id": str(current_user.id)}
                    ],
                    "status": {"$in": ["pending", "accepted"]}
                }
            ]
        }

    existing_partnership = await db.partnerships.find_one(partnership_query)

    if existing_partnership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Partnership invitation already exists or is pending"
        )

    # Create partnership - store invited email even if user doesn't exist yet
    partnership_dict = {
        "user1_id": str(current_user.id),
        "invited_email": partnership_data.invited_user_email,
        "status": "pending",
        "invited_by": str(current_user.id),
        "created_at": datetime.utcnow()
    }
    
    # If the invited user exists, also store their user ID
    if invited_user:
        partnership_dict["user2_id"] = str(invited_user["_id"])

    result = await db.partnerships.insert_one(partnership_dict)

    # Send invitation email (don't fail the request if email fails)
    partnership_id = str(result.inserted_id)
    invitation_link = f"https://loom.studiodtw.net/accept-invitation/{partnership_id}"

    try:
        email_sent = await send_partnership_invitation(
            inviter_name=current_user.display_name,
            invitee_email=partnership_data.invited_user_email,
            invitation_link=invitation_link
        )
        if not email_sent:
            # Log that email failed but don't fail the request
            print(f"Warning: Failed to send invitation email to {partnership_data.invited_user_email}")
    except Exception as e:
        # Log error but don't fail the request
        print(f"Error sending invitation email: {e}")

    return ApiResponse(
        data={"partnership_id": partnership_id},
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

    # Check if current user is the intended recipient
    # They must either be the invited_email or have the user2_id matching
    is_recipient = False
    if partnership.get("invited_email") == current_user.email:
        is_recipient = True
    elif partnership.get("user2_id") and partnership["user2_id"] == str(current_user.id):
        is_recipient = True

    if not is_recipient:
        raise HTTPException(status_code=403, detail="Not authorized to accept this invitation")

    # Check if user is trying to accept their own invitation
    if partnership["invited_by"] == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot accept your own invitation")

    # Update partnership to mark as accepted and associate with current user
    update_data = {
        "status": "accepted",
        "accepted_at": datetime.utcnow(),
        "user2_id": str(current_user.id)  # Ensure user2_id is set
    }

    await db.partnerships.update_one(
        {"_id": ObjectId(partnership_id)},
        {"$set": update_data}
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