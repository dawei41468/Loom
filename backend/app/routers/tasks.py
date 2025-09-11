from fastapi import APIRouter, Depends
from ..models import TaskCreate, TaskUpdate, User, ApiResponse
from ..auth import get_current_user
from ..service_layer.tasks_service import get_tasks_service, TasksService

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=ApiResponse)
async def get_tasks(
    current_user: User = Depends(get_current_user),
    tasks_service: TasksService = Depends(get_tasks_service),
):
    """Get all tasks for the current user"""
    tasks = await tasks_service.get_tasks_for_user(current_user)
    return ApiResponse(data=[t.model_dump() for t in tasks], message="Tasks retrieved successfully")


@router.post("", response_model=ApiResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    tasks_service: TasksService = Depends(get_tasks_service),
):
    """Create a new task"""
    task = await tasks_service.create_task(task_data, current_user)
    return ApiResponse(data=task.model_dump(), message="Task created successfully")


@router.get("/{task_id}", response_model=ApiResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    tasks_service: TasksService = Depends(get_tasks_service),
):
    """Get a specific task by ID"""
    task = await tasks_service.get_task(task_id, current_user)
    return ApiResponse(data=task.model_dump(), message="Task retrieved successfully")


@router.patch("/{task_id}/toggle", response_model=ApiResponse)
async def toggle_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    tasks_service: TasksService = Depends(get_tasks_service),
):
    """Toggle task completion status"""
    task = await tasks_service.toggle_task(task_id, current_user)
    return ApiResponse(data=task.model_dump(), message="Task status updated successfully")


@router.put("/{task_id}", response_model=ApiResponse)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    tasks_service: TasksService = Depends(get_tasks_service),
):
    """Update a task"""
    task = await tasks_service.update_task(task_id, task_update, current_user)
    return ApiResponse(data=task.model_dump(), message="Task updated successfully")


@router.delete("/{task_id}", response_model=ApiResponse)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    tasks_service: TasksService = Depends(get_tasks_service),
):
    """Delete a task"""
    await tasks_service.delete_task(task_id, current_user)
    return ApiResponse(message="Task deleted successfully")