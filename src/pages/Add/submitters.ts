import { Event, Proposal, Toast } from '../../types';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queries';

interface Ctx {
  apiClient: any;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  queryClient: QueryClient;
  t: (key: string) => string;
}

export async function submitEvent(
  params: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    visibility: 'shared' | 'private' | 'title_only';
    attendees: string[];
    created_by: string;
    reminders: number[];
  },
  ctx: Ctx,
  options?: { successDescription?: string }
) {
  const { apiClient, addToast, queryClient, t } = ctx;
  // Optimistic event stub
  const tempId = `temp-${Date.now()}`;
  const optimisticEvent: Partial<Event> & { id: string } = {
    id: tempId,
    title: params.title,
    description: params.description,
    start_time: params.start_time,
    end_time: params.end_time,
    location: params.location,
    visibility: params.visibility,
    attendees: params.attendees,
    created_by: params.created_by,
    reminders: params.reminders,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  // Add optimistically to React Query cache
  queryClient.setQueryData<any>(queryKeys.events, (old: any) => {
    const list = old?.data ?? old ?? [];
    const next = [...list, optimisticEvent];
    return old?.data ? { ...old, data: next } : next;
  });

  try {
    const event = await apiClient.createEvent(params);
    // Replace optimistic with server result
    queryClient.setQueryData<any>(queryKeys.events, (old: any) => {
      const list = old?.data ?? old ?? [];
      const next = list.map((e: Event) => (e.id === tempId ? event.data : e));
      return old?.data ? { ...old, data: next } : next;
    });
    addToast({
      type: 'success',
      title: t('eventCreated'),
      description: options?.successDescription ?? `"${params.title}" ${t('addedToCalendar')}`,
    });
    return event.data;
  } catch (error: any) {
    // Rollback optimistic add
    queryClient.setQueryData<any>(queryKeys.events, (old: any) => {
      const list = old?.data ?? old ?? [];
      const next = list.filter((e: Event) => e.id !== tempId);
      return old?.data ? { ...old, data: next } : next;
    });
    addToast({
      type: 'error',
      title: t('failedToCreateEvent'),
      description: error?.message || t('pleaseTryAgain'),
    });
    throw error;
  }
}

export async function submitProposal(
  params: {
    title: string;
    description?: string;
    message?: string;
    proposed_times: { start_time: string; end_time: string }[];
    location?: string;
    proposed_to: string;
  },
  ctx: Ctx,
  options?: { successDescription?: string }
) {
  const { apiClient, addToast, queryClient, t } = ctx;
  const tempId = `temp-${Date.now()}`;
  const optimisticProposal: Partial<Proposal> & { id: string } = {
    id: tempId,
    title: params.title,
    description: params.description,
    message: params.message,
    proposed_times: params.proposed_times,
    location: params.location,
    proposed_to: params.proposed_to,
    // proposed_by will be set by backend; leave undefined here
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any;

  // Add optimistically to proposals cache
  queryClient.setQueryData<any>(queryKeys.proposals, (old: any) => {
    const list = old?.data ?? old ?? [];
    const next = [...list, optimisticProposal];
    return old?.data ? { ...old, data: next } : next;
  });

  try {
    const proposal = await apiClient.createProposal(params);
    queryClient.setQueryData<any>(queryKeys.proposals, (old: any) => {
      const list = old?.data ?? old ?? [];
      const next = list.map((p: Proposal) => (p.id === tempId ? proposal.data : p));
      return old?.data ? { ...old, data: next } : next;
    });
    addToast({
      type: 'success',
      title: t('proposalSent'),
      description: options?.successDescription ?? `${t('sent')} "${params.title}"`,
    });
    return proposal.data;
  } catch (error: any) {
    queryClient.setQueryData<any>(queryKeys.proposals, (old: any) => {
      const list = old?.data ?? old ?? [];
      const next = list.filter((p: Proposal) => p.id !== tempId);
      return old?.data ? { ...old, data: next } : next;
    });
    addToast({
      type: 'error',
      title: t('failedToCreateProposal') || 'Failed to create proposal',
      description: error?.message || t('pleaseTryAgain'),
    });
    throw error;
  }
}
