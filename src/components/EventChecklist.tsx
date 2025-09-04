import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Check, Circle, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { ChecklistItem } from '../types';
import { queryKeys, eventChecklistQueries } from '../api/queries';
import { apiClient } from '../api/client';
import { cn } from '@/lib/utils';

interface EventChecklistProps {
  eventId: string;
}

const EventChecklist: React.FC<EventChecklistProps> = ({ eventId }) => {
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch checklist items
  const { data: checklistData, isLoading, error } = useQuery({
    queryKey: queryKeys.eventChecklist(eventId),
    queryFn: () => eventChecklistQueries.getEventChecklist(eventId),
  });

  const checklistItems = checklistData?.data || [];
  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;

  // Create checklist item mutation
  const createItemMutation = useMutation({
    mutationFn: (item: { title: string; description?: string }) =>
      apiClient.createChecklistItem(eventId, item),
    onSuccess: () => {
      setNewItemTitle('');
      setNewItemDescription('');
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.eventChecklist(eventId) });
      addToast({
        type: 'success',
        title: 'Item added',
        description: 'Checklist item has been created.',
      });
    },
    onError: (error) => {
      console.error('Failed to create checklist item:', error);
      addToast({
        type: 'error',
        title: 'Failed to add item',
        description: 'Please try again.',
      });
    },
  });

  // Update checklist item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: { completed: boolean } }) =>
      apiClient.updateChecklistItem(eventId, itemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventChecklist(eventId) });
    },
    onError: (error) => {
      console.error('Failed to update checklist item:', error);
      addToast({
        type: 'error',
        title: 'Failed to update item',
        description: 'Please try again.',
      });
    },
  });

  // Delete checklist item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => apiClient.deleteChecklistItem(eventId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventChecklist(eventId) });
      addToast({
        type: 'success',
        title: 'Item deleted',
      });
    },
    onError: (error) => {
      console.error('Failed to delete checklist item:', error);
      addToast({
        type: 'error',
        title: 'Failed to delete item',
        description: 'Please try again.',
      });
    },
  });

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    createItemMutation.mutate({
      title: newItemTitle.trim(),
      description: newItemDescription.trim() || undefined,
    });
  };

  const handleToggleComplete = (item: ChecklistItem) => {
    updateItemMutation.mutate({
      itemId: item.id,
      updates: { completed: !item.completed },
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this checklist item?')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const getCreatorInfo = (item: ChecklistItem) => {
    if (item.created_by === user?.id) {
      return {
        name: 'You',
        color: 'bg-[hsl(var(--loom-user))]',
      };
    } else {
      return {
        name: partner?.display_name || 'Partner',
        color: 'bg-[hsl(var(--loom-partner))]',
      };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--loom-primary))]"></div>
        <span className="ml-2 text-sm text-[hsl(var(--loom-text-muted))]">Loading checklist...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[hsl(var(--loom-text-muted))] text-sm">
          Failed to load checklist. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium">Checklist</h3>
          {totalCount > 0 && (
            <span className="text-sm text-[hsl(var(--loom-text-muted))]">
              ({completedCount}/{totalCount} completed)
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-2 hover:bg-[hsl(var(--loom-border))] rounded-full transition-colors"
          title="Add new item"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-[hsl(var(--loom-border))] rounded-full h-2">
          <div
            className="bg-[hsl(var(--loom-primary))] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Add new item form */}
      {showAddForm && (
        <form onSubmit={handleCreateItem} className="space-y-3 p-4 border border-[hsl(var(--loom-border))] rounded-lg">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Item title..."
            className="w-full px-3 py-2 border border-[hsl(var(--loom-border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent"
            required
          />
          <textarea
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            placeholder="Description (optional)..."
            rows={2}
            className="w-full px-3 py-2 border border-[hsl(var(--loom-border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent resize-none"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewItemTitle('');
                setNewItemDescription('');
              }}
              className="px-4 py-2 text-sm text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newItemTitle.trim() || createItemMutation.isPending}
              className={cn(
                'px-4 py-2 text-sm rounded-lg transition-colors',
                newItemTitle.trim() && !createItemMutation.isPending
                  ? 'bg-[hsl(var(--loom-primary))] text-white hover:bg-[hsl(var(--loom-primary))]/90'
                  : 'bg-[hsl(var(--loom-border))] text-[hsl(var(--loom-text-muted))] cursor-not-allowed'
              )}
            >
              {createItemMutation.isPending ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      )}

      {/* Checklist items */}
      <div className="space-y-2">
        {checklistItems.length === 0 ? (
          <div className="text-center py-8">
            <Circle className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--loom-text-muted))] opacity-50" />
            <h3 className="font-medium mb-2">No checklist items yet</h3>
            <p className="text-[hsl(var(--loom-text-muted))] text-sm">
              Create a shared checklist for this event
            </p>
          </div>
        ) : (
          checklistItems.map((item) => {
            const creatorInfo = getCreatorInfo(item);
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-start space-x-3 p-3 border border-[hsl(var(--loom-border))] rounded-lg transition-all',
                  item.completed ? 'bg-[hsl(var(--loom-success))]/5 border-[hsl(var(--loom-success))]/20' : ''
                )}
              >
                <button
                  onClick={() => handleToggleComplete(item)}
                  className={cn(
                    'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    item.completed
                      ? 'bg-[hsl(var(--loom-success))] border-[hsl(var(--loom-success))] text-white'
                      : 'border-[hsl(var(--loom-border))] hover:border-[hsl(var(--loom-primary))]'
                  )}
                  disabled={updateItemMutation.isPending}
                >
                  {item.completed && <Check className="w-3 h-3" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'font-medium text-sm',
                    item.completed ? 'line-through text-[hsl(var(--loom-text-muted))]' : ''
                  )}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div className={cn(
                      'text-sm mt-1',
                      item.completed ? 'text-[hsl(var(--loom-text-muted))]' : 'text-[hsl(var(--loom-text))]'
                    )}>
                      {item.description}
                    </div>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    <div className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold',
                      creatorInfo.color
                    )}>
                      {creatorInfo.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-[hsl(var(--loom-text-muted))]">
                      {creatorInfo.name} • {format(new Date(item.created_at), 'MMM d, h:mm a')}
                    </span>
                    {item.completed && item.completed_by && (
                      <span className="text-xs text-[hsl(var(--loom-success))]">
                        ✓ Completed {item.completed_by === user?.id ? 'by you' : 'by partner'}
                      </span>
                    )}
                  </div>
                </div>

                {item.created_by === user?.id && (
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 hover:bg-[hsl(var(--loom-danger))]/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4 text-[hsl(var(--loom-danger))]" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EventChecklist;