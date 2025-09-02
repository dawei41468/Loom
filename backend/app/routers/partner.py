from fastapi import APIRouter, Depends, HTTPException, status
from ..models import Partner, User, ApiResponse
from ..auth import get_current_user
from ..database import get_database
from bson import ObjectId

router = APIRouter(prefix="/partner", tags=["partner"])


@router.get("", response_model=ApiResponse)
async def get_partner(current_user: User = Depends(get_current_user)):
    """Get partner information for the current user"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # For now, we'll implement a simple partner relationship
    # In a real app, you'd have a proper partnership/relationship table
    # This is a simplified version that finds another user as "partner"
    
    # Find the first user that is not the current user (simplified for demo)
    partner_doc = await db.users.find_one({
        "_id": {"$ne": ObjectId(str(current_user.id))}
    })
    
    if not partner_doc:
        return ApiResponse(data=None, message="No partner found")
    
    # Create partner object (simplified - just taking another user)
    partner_data = {
        "id": str(partner_doc["_id"]),
        "display_name": partner_doc.get("display_name", "Partner"),
        "color_preference": "partner",
        "timezone": partner_doc.get("timezone", "UTC"),
        "invite_status": "accepted",
        "connected_at": partner_doc.get("created_at")
    }
    
    partner = Partner(**partner_data)
    return ApiResponse(data=partner.dict(), message="Partner retrieved successfully")


@router.post("/invite", response_model=ApiResponse)
async def invite_partner(
    partner_email: str,
    current_user: User = Depends(get_current_user)
):
    """Invite a partner by email (simplified implementation)"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Find user by email
    partner_user = await db.users.find_one({"email": partner_email})
    if not partner_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email not found"
        )
    
    if str(partner_user["_id"]) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself as partner"
        )
    
    # In a real implementation, you would:
    # 1. Create a partnership request
    # 2. Send notification/email to the invited user
    # 3. Allow them to accept/decline
    
    # For now, we'll just return success
    partner_data = {
        "id": str(partner_user["_id"]),
        "display_name": partner_user.get("display_name", "Partner"),
        "color_preference": "partner",
        "timezone": partner_user.get("timezone", "UTC"),
        "invite_status": "pending"
    }
    
    partner = Partner(**partner_data)
    return ApiResponse(data=partner.dict(), message="Partner invitation sent successfully")