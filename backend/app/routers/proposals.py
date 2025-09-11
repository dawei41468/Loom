from fastapi import APIRouter, Depends
from ..models import ProposalCreate, User, ApiResponse, TimeSlot
from ..auth import get_current_user
from ..service_layer.proposal_service import get_proposal_service, ProposalService

router = APIRouter(prefix="/proposals", tags=["proposals"])


@router.get("", response_model=ApiResponse)
async def get_proposals(
    current_user: User = Depends(get_current_user),
    proposal_service: ProposalService = Depends(get_proposal_service)
):
    """Get all proposals for the current user (sent and received)"""
    proposals = await proposal_service.get_proposals_for_user(current_user)
    return ApiResponse(data=[p.model_dump() for p in proposals], message="Proposals retrieved successfully")


@router.post("", response_model=ApiResponse)
async def create_proposal(
    proposal_data: ProposalCreate,
    current_user: User = Depends(get_current_user),
    proposal_service: ProposalService = Depends(get_proposal_service)
):
    """Create a new proposal"""
    proposal = await proposal_service.create_proposal(proposal_data, current_user)
    return ApiResponse(data=proposal.model_dump(), message="Proposal created successfully")


@router.post("/{proposal_id}/accept", response_model=ApiResponse)
async def accept_proposal(
    proposal_id: str,
    selected_time_slot: TimeSlot,
    current_user: User = Depends(get_current_user),
    proposal_service: ProposalService = Depends(get_proposal_service)
):
    """Accept a proposal and create an event"""
    proposal, event = await proposal_service.accept_proposal(proposal_id, selected_time_slot, current_user)
    return ApiResponse(
        data={
            "proposal": proposal.model_dump(),
            "event": event.model_dump()
        },
        message="Proposal accepted and event created successfully"
    )


@router.post("/{proposal_id}/decline", response_model=ApiResponse)
async def decline_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    proposal_service: ProposalService = Depends(get_proposal_service)
):
    """Decline a proposal"""
    proposal = await proposal_service.decline_proposal(proposal_id, current_user)
    return ApiResponse(data=proposal.model_dump(), message="Proposal declined successfully")


@router.get("/{proposal_id}", response_model=ApiResponse)
async def get_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    proposal_service: ProposalService = Depends(get_proposal_service)
):
    """Get a specific proposal by ID"""
    proposal = await proposal_service.get_proposal_by_id(proposal_id, current_user)
    return ApiResponse(data=proposal.model_dump(), message="Proposal retrieved successfully")