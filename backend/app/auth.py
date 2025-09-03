from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from .config import settings
from .models import TokenData, User
from .database import get_database

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Security
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT refresh token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def verify_refresh_token(token: str) -> Optional[str]:
    """Verify refresh token and return user_id if valid"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        token_type = payload.get("type")
        if token_type != "refresh":
            return None
        user_id = payload.get("sub")
        return str(user_id) if user_id else None
    except JWTError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=str(user_id))
    except JWTError:
        raise credentials_exception
    
    db = get_database()
    if db is None:
        raise credentials_exception
    from bson import ObjectId
    user_doc = await db.users.find_one({"_id": ObjectId(token_data.user_id)})
    if user_doc is None:
        raise credentials_exception
    
    # Convert ObjectId to string for Pydantic validation
    user_doc["_id"] = str(user_doc["_id"])
    return User(**user_doc)


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authenticate user by email and password"""
    db = get_database()
    if db is None:
        return None
    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        return None
    
    # Convert ObjectId to string for Pydantic validation
    user_doc["_id"] = str(user_doc["_id"])
    user = User(**user_doc)
    if not verify_password(password, user_doc.get("password_hash", "")):
        return None
    
    return user