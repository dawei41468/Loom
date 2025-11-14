from datetime import datetime, timezone
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
            core_schema.no_info_plain_validator_function(cls.validate)
        ], serialization=core_schema.to_string_ser_schema())

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
    # Viewer-centric color preferences: can be 'user', 'partner', or a hex color like '#14b8a6'
    ui_self_color: str = "user"
    ui_partner_color: str = "partner"
    timezone: str = "UTC"
    language: Literal["en", "zh"] = "en"
    is_onboarded: bool = False


class UserCreate(BaseModel):
    email: str
    display_name: str
    password: str
    color_preference: Literal["user", "partner"] = "user"
    ui_self_color: str = "user"
    ui_partner_color: str = "partner"
    timezone: str = "UTC"
    language: Literal["en", "zh"] = "en"


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    color_preference: Optional[Literal["user", "partner"]] = None
    ui_self_color: Optional[str] = None
    ui_partner_color: Optional[str] = None
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
    user1_id: PyObjectId
    user2_id: Optional[PyObjectId] = None  # Optional - may not exist yet if user hasn't signed up
    invited_email: str  # Email of the invited user
    status: Literal["pending", "accepted", "declined"] = "pending"
    invited_by: PyObjectId  # User ID who sent the invitation
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None

    @field_serializer('user1_id', 'user2_id', 'invited_by')
    def serialize_object_ids(self, value):
        return str(value) if value else None


class Partnership(MongoBaseModel, PartnershipBase):
    pass


class PartnershipCreate(BaseModel):
    invited_user_email: str


# Invite Token Models
class InviteTokenBase(BaseModel):
    token: str
    created_by: PyObjectId  # User ID who created the invite
    expires_at: datetime
    used: bool = False
    used_by: Optional[PyObjectId] = None  # User ID who used the invite
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer('created_by', 'used_by')
    def serialize_object_ids(self, value):
        return str(value) if value else None


class InviteToken(MongoBaseModel, InviteTokenBase):
    pass


class InviteTokenCreate(BaseModel):
    expires_in_days: int = 7  # Default 7 days


# Event Models
class TimeSlot(BaseModel):
    start_time: datetime
    end_time: datetime

    # Ensure datetimes are serialized with explicit UTC 'Z' to avoid ambiguity
    @field_serializer('start_time', 'end_time')
    def serialize_times(self, value: datetime):
        if value.tzinfo is None:
            # Assume naive datetimes are UTC in storage
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None
    visibility: Literal["shared", "private", "title_only"] = "shared"
    attendees: List[PyObjectId] = []  # User IDs
    reminders: List[int] = []  # Minutes before event

    @field_serializer('attendees')
    def serialize_attendees(self, value):
        return [str(attendee) for attendee in value]

    # Serialize start/end with explicit UTC 'Z'
    @field_serializer('start_time', 'end_time')
    def serialize_event_times(self, value: datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    visibility: Optional[Literal["shared", "private", "title_only"]] = None
    attendees: Optional[List[PyObjectId]] = None
    reminders: Optional[List[int]] = None

    @field_serializer('attendees')
    def serialize_attendees(self, value):
        return [str(attendee) for attendee in value] if value else None


class Event(MongoBaseModel, EventBase):
    created_by: PyObjectId  # User ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer('created_by')
    def serialize_created_by(self, value):
        return str(value)

    # Serialize created/updated with explicit UTC 'Z'
    @field_serializer('created_at', 'updated_at')
    def serialize_audit_times(self, value: datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


# Proposal Models
class ProposalBase(BaseModel):
    title: str
    description: Optional[str] = None
    proposed_times: List[TimeSlot]
    location: Optional[str] = None
    message: Optional[str] = None
    proposed_to: PyObjectId  # User ID

    @field_serializer('proposed_to')
    def serialize_proposed_to(self, value):
        return str(value)


class ProposalCreate(ProposalBase):
    pass


class Proposal(MongoBaseModel, ProposalBase):
    proposed_by: PyObjectId  # User ID
    status: Literal["pending", "accepted", "declined"] = "pending"
    accepted_time_slot: Optional[TimeSlot] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer('proposed_by')
    def serialize_proposed_by(self, value):
        return str(value)


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
    created_by: PyObjectId  # User ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer('created_by')
    def serialize_created_by(self, value):
        return str(value)


# Event Chat Models
class EventMessageBase(BaseModel):
    event_id: PyObjectId
    sender_id: PyObjectId
    message: str

    @field_serializer('event_id', 'sender_id')
    def serialize_object_ids(self, value):
        return str(value)


class EventMessageCreate(BaseModel):
    message: str


class EventMessage(MongoBaseModel, EventMessageBase):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Event Checklist Models
class ChecklistItemBase(BaseModel):
    event_id: PyObjectId
    title: str
    description: Optional[str] = None
    completed: bool = False
    assigned_to: Optional[PyObjectId] = None  # User ID assigned to this item

    @field_serializer('event_id')
    def serialize_event_id(self, value):
        return str(value)
    
    @field_serializer('assigned_to')
    def serialize_assigned_to(self, value):
        return str(value) if value else None


class ChecklistItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[PyObjectId] = None


class ChecklistItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    assigned_to: Optional[PyObjectId] = None


class ChecklistItem(MongoBaseModel, ChecklistItemBase):
    completed_by: Optional[PyObjectId] = None  # User ID who completed it
    completed_at: Optional[datetime] = None
    created_by: PyObjectId  # User ID who created it
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_serializer('completed_by', 'created_by')
    def serialize_object_ids(self, value):
        return str(value) if value else None


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
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    current_password: str

