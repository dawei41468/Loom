import { Toast } from '../../types';

interface Ctx {
  apiClient: any;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  addEvent: (event: any) => void;
  addProposal: (proposal: any) => void;
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
  const { apiClient, addToast, addEvent, t } = ctx;
  const event = await apiClient.createEvent(params);
  addEvent(event.data);
  addToast({
    type: 'success',
    title: t('eventCreated'),
    description: options?.successDescription ?? `"${params.title}" ${t('addedToCalendar')}`,
  });
  return event.data;
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
  const { apiClient, addToast, addProposal, t } = ctx;
  const proposal = await apiClient.createProposal(params);
  addProposal(proposal.data);
  addToast({
    type: 'success',
    title: t('proposalSent'),
    description: options?.successDescription ?? `${t('sent')} "${params.title}"`,
  });
  return proposal.data;
}
