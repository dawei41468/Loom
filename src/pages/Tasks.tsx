// Lightweight Tasks Page
import React, { useState } from 'react';
import { format, isToday, isTomorrow, parseISO, isPast } from 'date-fns';
import { Plus, Check, Trash2, Calendar } from 'lucide-react';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18n';
import TextInput from '../components/forms/TextInput';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, taskQueries } from '../api/queries';

const Tasks = () => {
  const queryClient = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: taskQueries.getTasks,
    select: (resp) => resp.data ?? [],
    staleTime: 30_000,
  });
  const { user } = useAuthState();
  const { addToast } = useToastContext();
  const { t } = useTranslation();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // Tasks are loaded via React Query

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const tempId = `temp-${Date.now()}`;
      // Optimistically add to cache
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
      const previous = queryClient.getQueryData<any>(queryKeys.tasks);
      queryClient.setQueryData<any>(queryKeys.tasks, (old: any) => {
        const list = old?.data ?? old ?? [];
        const temp = {
          id: tempId,
          title: newTaskTitle,
          created_by: user!.id,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any;
        const next = [...list, temp];
        return old?.data ? { ...old, data: next } : next;
      });

      try {
        const task = await apiClient.createTask({ title: newTaskTitle, created_by: user!.id });
        // Replace optimistic with server result
        queryClient.setQueryData<any>(queryKeys.tasks, (old: any) => {
          const list = old?.data ?? old ?? [];
          const next = list.map((t: any) => (t.id === tempId ? task.data : t));
          return old?.data ? { ...old, data: next } : next;
        });
        setNewTaskTitle('');
        addToast({ type: 'success', title: t('taskAdded') });
      } catch (error) {
        // Rollback optimistic add
        queryClient.setQueryData(queryKeys.tasks, previous);
        throw error;
      } finally {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: t('failedToAddTask'),
        description: t('pleaseTryAgain'),
      });
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const current = tasks.find((t: any) => t.id === taskId);
    if (!current) return;
    await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
    const previous = queryClient.getQueryData<any>(queryKeys.tasks);
    // Optimistic toggle
    queryClient.setQueryData<any>(queryKeys.tasks, (old: any) => {
      const list = old?.data ?? old ?? [];
      const next = list.map((t: any) => (t.id === taskId ? { ...t, completed: !current.completed } : t));
      return old?.data ? { ...old, data: next } : next;
    });
    try {
      const task = await apiClient.toggleTask(taskId);
      queryClient.setQueryData<any>(queryKeys.tasks, (old: any) => {
        const list = old?.data ?? old ?? [];
        const next = list.map((t: any) => (t.id === taskId ? task.data : t));
        return old?.data ? { ...old, data: next } : next;
      });
    } catch (error) {
      queryClient.setQueryData(queryKeys.tasks, previous);
      addToast({ type: 'error', title: t('failedToUpdateTask'), description: t('pleaseTryAgain') });
    } finally {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.tasks });
    const previous = queryClient.getQueryData<any>(queryKeys.tasks);
    // Optimistically remove
    queryClient.setQueryData<any>(queryKeys.tasks, (old: any) => {
      const list = old?.data ?? old ?? [];
      const next = list.filter((t: any) => t.id !== taskId);
      return old?.data ? { ...old, data: next } : next;
    });
    try {
      await apiClient.deleteTask(taskId);
      addToast({ type: 'success', title: t('taskDeleted') });
    } catch (error) {
      // Rollback
      queryClient.setQueryData(queryKeys.tasks, previous);
      addToast({ type: 'error', title: t('failedToDeleteTask'), description: t('pleaseTryAgain') });
    } finally {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    }
  };

  const activeTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  const getTaskTimeText = (task: { due_date?: string; completed: boolean }) => {
    if (!task.due_date) return null;

    const dueDate = parseISO(task.due_date);
    if (isToday(dueDate)) return t('taskToday');
    if (isTomorrow(dueDate)) return t('tomorrow');
    if (isPast(dueDate)) return t('overdue');
    return format(dueDate, 'MM/dd/yyyy');
  };

  const isOverdue = (task: { due_date?: string; completed: boolean }) => {
    if (!task.due_date || task.completed) return false;
    return isPast(parseISO(task.due_date));
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('tasks')}</h1>
        <span className="text-sm text-[hsl(var(--loom-text-muted))]">
          {activeTasks.length} {t('active')}
        </span>
      </div>

      {/* Add Task */}
      <div className="loom-card">
        <div className="flex items-center space-x-3">
          <Plus className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <TextInput
            variant="bare"
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder={t('addNewTask')}
            className="flex-1 placeholder-[hsl(var(--loom-text-muted))]"
          />
          {newTaskTitle.trim() && (
            <button
              onClick={handleAddTask}
              className="loom-chip loom-chip-shared"
            >
              {t('add')}
            </button>
          )}
        </div>
      </div>

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-medium text-[hsl(var(--loom-text-muted))] uppercase text-sm tracking-wide">
            {t('toDo')}
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
              {t('completed')} ({completedTasks.length})
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
          <h3 className="font-medium mb-2">{t('noTasks')}</h3>
          <p className="text-[hsl(var(--loom-text-muted))] text-sm">
            {t('addFirstTask')}
          </p>
        </div>
      )}
    </div>
  );
};

export default Tasks;