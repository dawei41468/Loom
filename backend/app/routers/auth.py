from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..models import User, UserCreate, UserLogin, Token, ApiResponse
from ..auth import authenticate_user, create_access_token, create_refresh_token, verify_refresh_token, get_password_hash, get_current_user
from ..database import get_database
from ..config import settings
from ..security import validate_password_strength, validate_email_format
from bson import ObjectId

# Rate limiter for auth endpoints
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


@router.post("/register", response_model=ApiResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate):
    """Register a new user"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate email format
    if not validate_email_format(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )

    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Validate password strength
    password_valid, password_error = validate_password_strength(user_data.password)
    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=password_error
        )

    # Create new user
    user_dict = user_data.dict(exclude={"password"})
    user_dict["password_hash"] = get_password_hash(user_data.password)
    user_dict["is_onboarded"] = False
    
    # Insert user into database
    result = await db.users.insert_one(user_dict)
    
    # Get the created user
    created_user = await db.users.find_one({"_id": result.inserted_id})
    if not created_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Remove password hash from response
    created_user.pop("password_hash", None)
    user = User(**created_user)
    
    return ApiResponse(data=user.dict(), message="User registered successfully")


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(request: Request, user_credentials: UserLogin):
    """Login user and return access token"""
    user = await authenticate_user(user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")


@router.post("/refresh", response_model=Token)
@limiter.limit("10/minute")
async def refresh_token(request: Request, refresh_token_request: dict):
    """Refresh access token using refresh token"""
    refresh_token = refresh_token_request.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token required"
        )

    user_id = verify_refresh_token(refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create new tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": user_id})

    return Token(access_token=access_token, refresh_token=new_refresh_token, token_type="bearer")


@router.get("/me", response_model=ApiResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return ApiResponse(data=current_user.dict(), message="User info retrieved successfully")


@router.put("/me", response_model=ApiResponse)
async def update_current_user(
    user_update: dict,
    current_user: User = Depends(get_current_user)
):
    """Update current user information"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )

    # Update user
    update_data = {}
    if "display_name" in user_update:
        update_data["display_name"] = user_update["display_name"]
    if "color_preference" in user_update:
        update_data["color_preference"] = user_update["color_preference"]
    if "timezone" in user_update:
        update_data["timezone"] = user_update["timezone"]
    if "language" in user_update:
        update_data["language"] = user_update["language"]
    if "is_onboarded" in user_update:
        update_data["is_onboarded"] = user_update["is_onboarded"]

    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        result = await db.users.update_one(
            {"_id": current_user.id},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )

    # Get updated user
    updated_user = await db.users.find_one({"_id": current_user.id})
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated user"
        )

    updated_user.pop("password_hash", None)
    user = User(**updated_user)

    return ApiResponse(data=user.dict(), message="User updated successfully")