from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from ..models import Task, TaskCreate, TaskUpdate, User, ApiResponse
from ..auth import get_current_user
from ..database import get_database
from datetime import datetime

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=ApiResponse)
async def get_tasks(current_user: User = Depends(get_current_user)):
    """Get all tasks for the current user"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Get tasks created by the current user
    tasks_cursor = db.tasks.find({"created_by": str(current_user.id)})
    
    tasks = []
    async for task_doc in tasks_cursor:
        task = Task(**task_doc)
        tasks.append(task.dict())
    
    return ApiResponse(data=tasks, message="Tasks retrieved successfully")


@router.post("", response_model=ApiResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new task"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Create task document
    task_dict = task_data.dict()
    task_dict["created_by"] = str(current_user.id)
    task_dict["completed"] = False
    task_dict["created_at"] = datetime.utcnow()
    task_dict["updated_at"] = datetime.utcnow()
    
    # Insert task into database
    result = await db.tasks.insert_one(task_dict)
    
    # Get the created task
    created_task = await db.tasks.find_one({"_id": result.inserted_id})
    if not created_task:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create task"
        )
    
    task = Task(**created_task)
    return ApiResponse(data=task.dict(), message="Task created successfully")


@router.get("/{task_id}", response_model=ApiResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific task by ID"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(task_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID"
        )
    
    # Get task
    task_doc = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    task = Task(**task_doc)
    
    # Check if user owns this task
    if str(task.created_by) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this task"
        )
    
    return ApiResponse(data=task.dict(), message="Task retrieved successfully")


@router.patch("/{task_id}/toggle", response_model=ApiResponse)
async def toggle_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Toggle task completion status"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(task_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID"
        )
    
    # Check if task exists and user owns it
    task_doc = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    task = Task(**task_doc)
    if str(task.created_by) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this task"
        )
    
    # Toggle completion status
    new_status = not task.completed
    result = await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {
                "completed": new_status,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )
    
    # Get updated task
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not updated_task:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated task"
        )
    
    task = Task(**updated_task)
    return ApiResponse(data=task.dict(), message="Task status updated successfully")


@router.put("/{task_id}", response_model=ApiResponse)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a task"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(task_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID"
        )
    
    # Check if task exists and user owns it
    task_doc = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    task = Task(**task_doc)
    if str(task.created_by) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this task"
        )
    
    # Update task
    update_data = task_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )
    
    # Get updated task
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not updated_task:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated task"
        )
    
    task = Task(**updated_task)
    return ApiResponse(data=task.dict(), message="Task updated successfully")


@router.delete("/{task_id}", response_model=ApiResponse)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a task"""
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection not available"
        )
    
    # Validate ObjectId
    if not ObjectId.is_valid(task_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid task ID"
        )
    
    # Check if task exists and user owns it
    task_doc = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    task = Task(**task_doc)
    if str(task.created_by) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this task"
        )
    
    # Delete task
    result = await db.tasks.delete_one({"_id": ObjectId(task_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete task"
        )
    
    return ApiResponse(message="Task deleted successfully")