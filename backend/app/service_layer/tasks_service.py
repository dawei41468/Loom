from datetime import datetime, timezone
from typing import List
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from ..models import Task, TaskCreate, TaskUpdate, User
from ..database import get_database


class TasksService:
    def __init__(self, db):
        self.db = db

    async def get_tasks_for_user(self, user: User) -> List[Task]:
        cursor = self.db.tasks.find({"created_by": str(user.id)})
        return [Task(**doc) async for doc in cursor]

    async def create_task(self, task_data: TaskCreate, user: User) -> Task:
        task_dict = task_data.model_dump()
        task_dict["created_by"] = str(user.id)
        task_dict["completed"] = False
        task_dict["created_at"] = datetime.now(timezone.utc)
        task_dict["updated_at"] = datetime.now(timezone.utc)
        result = await self.db.tasks.insert_one(task_dict)
        created = await self.db.tasks.find_one({"_id": result.inserted_id})
        if not created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create task")
        return Task(**created)

    async def get_task(self, task_id: str, user: User) -> Task:
        if not ObjectId.is_valid(task_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid task ID")
        doc = await self.db.tasks.find_one({"_id": ObjectId(task_id)})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        task = Task(**doc)
        if str(task.created_by) != str(user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this task")
        return task

    async def toggle_task(self, task_id: str, user: User) -> Task:
        task = await self.get_task(task_id, user)
        new_status = not task.completed
        updated = await self.db.tasks.find_one_and_update(
            {"_id": ObjectId(task_id)},
            {"$set": {"completed": new_status, "updated_at": datetime.now(timezone.utc)}},
            return_document=ReturnDocument.AFTER,
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update task")
        return Task(**updated)

    async def update_task(self, task_id: str, task_update: TaskUpdate, user: User) -> Task:
        _ = await self.get_task(task_id, user)  # validates ownership
        update_data = task_update.model_dump(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        updated = await self.db.tasks.find_one_and_update(
            {"_id": ObjectId(task_id)},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER,
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update task")
        return Task(**updated)

    async def delete_task(self, task_id: str, user: User) -> None:
        task = await self.get_task(task_id, user)
        result = await self.db.tasks.delete_one({"_id": ObjectId(task.id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete task")


def get_tasks_service() -> TasksService:
    db = get_database()
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not available")
    return TasksService(db)
