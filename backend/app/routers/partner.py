from fastapi import APIRouter, Depends, HTTPException, status
from ..models import User, ApiResponse, InviteTokenCreate
from ..auth import get_current_user
from ..database import get_database
from ..service_layer.partner_service import get_partner_service, PartnerService

router = APIRouter(prefix="/partner", tags=["partner"])


@router.post("/generate-invite", response_model=ApiResponse)
async def generate_invite_token(
    invite_data: InviteTokenCreate,
    current_user: User = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service),
):
    """Generate a unique invite token for sharing"""
    data = await partner_service.generate_invite_token(invite_data, current_user)
    return ApiResponse(data=data, message="Invite link generated successfully")


@router.get("/check-invite/{token}", response_model=ApiResponse)
async def check_invite_token(token: str, partner_service: PartnerService = Depends(get_partner_service)):
    """Check if an invite token is valid and get inviter info"""
    data = await partner_service.check_invite_token(token)
    return ApiResponse(data=data, message="Valid invite token")




@router.post("/connect", response_model=ApiResponse)
async def connect_partner(
    token_data: dict,
    current_user: User = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service),
):
    """Connect with a partner using an invite token"""
    token = token_data.get("invite_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite token is required")
    partner = await partner_service.connect_partner(token, current_user)
    return ApiResponse(data=partner.model_dump(), message="Successfully connected with partner")


@router.get("", response_model=ApiResponse)
async def get_partner(
    current_user: User = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service),
):
    """Get current user's partner"""
    partner = await partner_service.get_partner(current_user)
    if not partner:
        return ApiResponse(data=None, message="No active partnership found")
    return ApiResponse(data=partner.model_dump(), message="Partner retrieved successfully")


@router.delete("", response_model=ApiResponse)
async def disconnect_partner(
    current_user: User = Depends(get_current_user),
    partner_service: PartnerService = Depends(get_partner_service),
):
    """Disconnect from current partner"""
    await partner_service.disconnect_partner(current_user)
    return ApiResponse(data=None, message="Successfully disconnected from partner")


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

