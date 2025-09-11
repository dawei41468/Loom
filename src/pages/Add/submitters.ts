import { Event, Proposal, Toast } from '../../types';

interface Ctx {
  apiClient: any;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  addEvent: (event: any) => void;
  addProposal: (proposal: any) => void;
  removeEvent: (eventId: string) => void;
  removeProposal: (proposalId: string) => void;
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
  const { apiClient, addToast, addEvent, removeEvent, t } = ctx;
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

  // Add optimistically
  addEvent(optimisticEvent as Event);

  try {
    const event = await apiClient.createEvent(params);
    // Replace optimistic with server result
    removeEvent(tempId);
    addEvent(event.data);
    addToast({
      type: 'success',
      title: t('eventCreated'),
      description: options?.successDescription ?? `"${params.title}" ${t('addedToCalendar')}`,
    });
    return event.data;
  } catch (error: any) {
    // Rollback optimistic add
    removeEvent(tempId);
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
  const { apiClient, addToast, addProposal, removeProposal, t } = ctx;
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

  addProposal(optimisticProposal as Proposal);

  try {
    const proposal = await apiClient.createProposal(params);
    removeProposal(tempId);
    addProposal(proposal.data);
    addToast({
      type: 'success',
      title: t('proposalSent'),
      description: options?.successDescription ?? `${t('sent')} "${params.title}"`,
    });
    return proposal.data;
  } catch (error: any) {
    removeProposal(tempId);
    addToast({
      type: 'error',
      title: t('failedToCreateProposal') || 'Failed to create proposal',
      description: error?.message || t('pleaseTryAgain'),
    });
    throw error;
  }
}
