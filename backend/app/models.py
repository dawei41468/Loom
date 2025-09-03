from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from pydantic.functional_serializers import field_serializer
from bson import ObjectId
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        return core_schema.union_schema([
            core_schema.is_instance_schema(ObjectId),
            core_schema.no_info_plain_validator_function(cls.validate, serialization=core_schema.to_string_ser_schema())
        ])

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")


class MongoBaseModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

    @field_serializer('id')
    def serialize_id(self, value):
        return str(value)


# User Models
class UserBase(BaseModel):
    email: str
    display_name: str
    color_preference: Literal["user", "partner"] = "user"
    timezone: str = "UTC"
    language: Literal["en", "zh"] = "en"
    is_onboarded: bool = False


class UserCreate(BaseModel):
    email: str
    display_name: str
    password: str
    color_preference: Literal["user", "partner"] = "user"
    timezone: str = "UTC"
    language: Literal["en", "zh"] = "en"


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    color_preference: Optional[Literal["user", "partner"]] = None
    timezone: Optional[str] = None
    language: Optional[Literal["en", "zh"]] = None


class User(MongoBaseModel, UserBase):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Partner Models
class PartnerBase(BaseModel):
    display_name: str
    color_preference: Literal["user", "partner"] = "partner"
    timezone: str = "UTC"
    invite_status: Literal["pending", "accepted"] = "pending"


class Partner(MongoBaseModel, PartnerBase):
    connected_at: Optional[datetime] = None


# Partnership Models
class PartnershipBase(BaseModel):
    user1_id: str
    user2_id: str
    status: Literal["pending", "accepted", "declined"] = "pending"
    invited_by: str  # User ID who sent the invitation
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None


class Partnership(MongoBaseModel, PartnershipBase):
    pass


class PartnershipCreate(BaseModel):
    invited_user_email: str


# Event Models
class TimeSlot(BaseModel):
    start_time: datetime
    end_time: datetime


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    visibility: Literal["shared", "private", "title_only"] = "shared"
    attendees: List[str] = []  # User IDs
    reminders: List[int] = []  # Minutes before event


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    visibility: Optional[Literal["shared", "private", "title_only"]] = None
    attendees: Optional[List[str]] = None
    reminders: Optional[List[int]] = None


class Event(MongoBaseModel, EventBase):
    created_by: str  # User ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Proposal Models
class ProposalBase(BaseModel):
    title: str
    description: Optional[str] = None
    proposed_times: List[TimeSlot]
    location: Optional[str] = None
    proposed_to: str  # User ID


class ProposalCreate(ProposalBase):
    pass


class Proposal(MongoBaseModel, ProposalBase):
    proposed_by: str  # User ID
    status: Literal["pending", "accepted", "declined"] = "pending"
    accepted_time_slot: Optional[TimeSlot] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Task Models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None


class Task(MongoBaseModel, TaskBase):
    completed: bool = False
    created_by: str  # User ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Availability Models
class AvailabilitySlot(BaseModel):
    start_time: datetime
    end_time: datetime
    duration_minutes: int


class AvailabilityRequest(BaseModel):
    duration_minutes: int
    date_range_days: int = 7


# API Response Models
from typing import Any

class ApiResponse(BaseModel):
    data: Optional[Any] = None
    message: Optional[str] = None


class ApiError(BaseModel):
    error: str
    details: Optional[str] = None


# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str