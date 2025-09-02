// Lightweight Tasks Page
import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, parseISO, isPast } from 'date-fns';
import { Plus, Check, Trash2, Calendar } from 'lucide-react';
import { useTasks, useTasksActions, useUser } from '../stores';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { cn } from '@/lib/utils';

const Tasks = () => {
  const tasks = useTasks();
  const { addTask, updateTask, removeTask, setTasks } = useTasksActions();
  const user = useUser();
  const { addToast } = useToastContext();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await apiClient.getTasks();
        setTasks(response.data);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to load tasks',
          description: 'Please try refreshing the page.',
        });
      }
    };

    loadTasks();
  }, []); // Store actions are stable, don't include in deps

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const task = await apiClient.createTask({
        title: newTaskTitle,
        created_by: user!.id,
      });

      addTask(task.data);
      setNewTaskTitle('');
      addToast({
        type: 'success',
        title: 'Task added',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to add task',
        description: 'Please try again.',
      });
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      const task = await apiClient.toggleTask(taskId);
      updateTask(taskId, task.data);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to update task',
        description: 'Please try again.',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiClient.deleteTask(taskId);
      removeTask(taskId);
      addToast({
        type: 'success',
        title: 'Task deleted',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to delete task',
        description: 'Please try again.',
      });
    }
  };

  const activeTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  const getTaskTimeText = (task: any) => {
    if (!task.due_date) return null;
    
    const dueDate = parseISO(task.due_date);
    if (isToday(dueDate)) return 'Today';
    if (isTomorrow(dueDate)) return 'Tomorrow';
    if (isPast(dueDate)) return 'Overdue';
    return format(dueDate, 'MMM d');
  };

  const isOverdue = (task: any) => {
    if (!task.due_date || task.completed) return false;
    return isPast(parseISO(task.due_date));
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <span className="text-sm text-[hsl(var(--loom-text-muted))]">
          {activeTasks.length} active
        </span>
      </div>

      {/* Add Task */}
      <div className="loom-card">
        <div className="flex items-center space-x-3">
          <Plus className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add a new task..."
            className="flex-1 bg-transparent border-none outline-none placeholder-[hsl(var(--loom-text-muted))]"
          />
          {newTaskTitle.trim() && (
            <button
              onClick={handleAddTask}
              className="loom-chip loom-chip-shared"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-[hsl(var(--loom-text-muted))] uppercase text-sm tracking-wide">
            To Do
          </h2>
          {activeTasks.map((task) => {
            const timeText = getTaskTimeText(task);
            const overdue = isOverdue(task);
            
            return (
              <div
                key={task.id}
                className={cn(
                  'loom-card flex items-center space-x-3 group hover:shadow-md transition-shadow',
                  overdue && 'border-[hsl(var(--loom-danger))] bg-[hsl(var(--loom-danger)/0.05)]'
                )}
              >
                <button
                  onClick={() => handleToggleTask(task.id)}
                  className="w-5 h-5 rounded border-2 border-[hsl(var(--loom-border))] hover:border-[hsl(var(--loom-primary))] transition-colors flex items-center justify-center"
                >
                  {task.completed && <Check className="w-3 h-3 text-[hsl(var(--loom-primary))]" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'font-medium',
                    task.completed && 'line-through text-[hsl(var(--loom-text-muted))]'
                  )}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                      {task.description}
                    </p>
                  )}
                  {timeText && (
                    <div className={cn(
                      'flex items-center space-x-1 mt-1',
                      overdue ? 'text-[hsl(var(--loom-danger))]' : 'text-[hsl(var(--loom-text-muted))]'
                    )}>
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">{timeText}</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-[hsl(var(--loom-border))] rounded-md transition-all"
                >
                  <Trash2 className="w-4 h-4 text-[hsl(var(--loom-danger))]" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Tasks Toggle */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center space-x-2 text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))] transition-colors"
          >
            <span className="font-medium uppercase text-sm tracking-wide">
              Completed ({completedTasks.length})
            </span>
            <div className={cn(
              'w-4 h-4 transition-transform',
              showCompleted && 'rotate-180'
            )}>
              ▼
            </div>
          </button>

          {showCompleted && (
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="loom-card flex items-center space-x-3 opacity-60 group hover:opacity-100 transition-opacity"
                >
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="w-5 h-5 rounded border-2 border-[hsl(var(--loom-primary))] bg-[hsl(var(--loom-primary))] flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-through text-[hsl(var(--loom-text-muted))]">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                        {task.description}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-[hsl(var(--loom-border))] rounded-md transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-[hsl(var(--loom-danger))]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {activeTasks.length === 0 && completedTasks.length === 0 && (
        <div className="loom-card text-center py-12">
          <Check className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))] opacity-50" />
          <h3 className="font-medium mb-2">No tasks yet</h3>
          <p className="text-[hsl(var(--loom-text-muted))] text-sm">
            Add your first task to get organized!
          </p>
        </div>
      )}
    </div>
  );
};

export default Tasks;