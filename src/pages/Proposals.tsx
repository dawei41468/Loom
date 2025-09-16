import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { queryKeys, proposalQueries } from '@/api/queries';
import { apiClient } from '@/api/client';
import { PageHeader } from '@/components/ui/page-header';
import { Section } from '@/components/ui/section';
import { useTranslation } from '@/i18n';
import { format, parseISO } from 'date-fns';

export default function ProposalsPage() {
  const navigate = useNavigate();
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  // Track selected time slot per proposal (index in proposed_times)
  const [selectedSlots, setSelectedSlots] = React.useState<Record<string, number>>({});

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: queryKeys.proposals,
    queryFn: proposalQueries.getProposals,
    select: (resp: any) => resp?.data ?? [],
    staleTime: 30_000,
  });

  const acceptProposalMutation = useMutation({
    mutationFn: ({ proposalId, selectedTimeSlot }: { proposalId: string; selectedTimeSlot: { start_time: string; end_time: string } }) =>
      apiClient.acceptProposal(proposalId, selectedTimeSlot),
    onMutate: async ({ proposalId, selectedTimeSlot }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.proposals });
      const prevProposals = queryClient.getQueryData<any>(queryKeys.proposals);
      queryClient.setQueryData<any>(queryKeys.proposals, (old: any) => {
        const list = old?.data ?? old ?? [];
        const next = list.map((p: any) =>
          String(p.id) === String(proposalId) ? { ...p, status: 'accepted', accepted_time_slot: selectedTimeSlot } : p
        );
        return old?.data ? { ...old, data: next } : next;
      });
      return { prevProposals };
    },
    onError: (error: any, _variables, context) => {
      if (context?.prevProposals !== undefined) {
        queryClient.setQueryData(queryKeys.proposals, context.prevProposals);
      }
      addToast({ type: 'error', title: t('failedToAcceptProposal'), description: String(error?.message || error) });
    },
    onSuccess: (resp) => {
      const accepted = resp.data?.proposal;
      const createdEvent = resp.data?.event;
      if (accepted?.id) {
        queryClient.setQueryData<any>(queryKeys.proposals, (old: any) => {
          const list = old?.data ?? old ?? [];
          const next = list.map((p: any) => (String(p.id) === String(accepted.id) ? accepted : p));
          return old?.data ? { ...old, data: next } : next;
        });
      }
      if (createdEvent) {
        queryClient.invalidateQueries({ queryKey: queryKeys.events });
        navigate(`/event/${createdEvent.id}`);
      }
      addToast({ type: 'success', title: t('proposalAccepted'), description: t('newEventCreated') });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
    },
  });

  const declineProposalMutation = useMutation({
    mutationFn: (proposalId: string) => apiClient.declineProposal(proposalId),
    onMutate: async (proposalId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.proposals });
      const prevProposals = queryClient.getQueryData<any>(queryKeys.proposals);
      queryClient.setQueryData<any>(queryKeys.proposals, (old: any) => {
        const list = old?.data ?? old ?? [];
        const next = list.map((p: any) => (String(p.id) === String(proposalId) ? { ...p, status: 'declined' } : p));
        return old?.data ? { ...old, data: next } : next;
      });
      return { prevProposals };
    },
    onError: (error: any, _proposalId, context) => {
      if (context?.prevProposals !== undefined) {
        queryClient.setQueryData(queryKeys.proposals, context.prevProposals);
      }
      addToast({ type: 'error', title: t('failedToDeclineProposal'), description: String(error?.message || error) });
    },
    onSuccess: (resp) => {
      const declined = resp.data;
      if (declined?.id) {
        queryClient.setQueryData<any>(queryKeys.proposals, (old: any) => {
          const list = old?.data ?? old ?? [];
          const next = list.map((p: any) => (String(p.id) === String(declined.id) ? declined : p));
          return old?.data ? { ...old, data: next } : next;
        });
      }
      addToast({ type: 'info', title: t('proposalDeclined'), description: t('proposalHasBeenDeclined') });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
    },
  });

  const pending = React.useMemo(() => proposals.filter((p: any) => p.status === 'pending'), [proposals]);
  const accepted = React.useMemo(() => proposals.filter((p: any) => p.status === 'accepted'), [proposals]);
  const declined = React.useMemo(() => proposals.filter((p: any) => p.status === 'declined'), [proposals]);

  return (
    <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
      <PageHeader title={t('proposals')} subtitle={partner ? `${t('youAnd')} ${partner.display_name}` : t('yourSchedule')} />

      <Section title={t('pendingProposals')} variant="card">
        {isLoading ? (
          <p className="text-sm opacity-80">{t('loading')}...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm opacity-80">{t('noPendingProposals')}</p>
        ) : (
          <div className="space-y-3">
            {pending.map((proposal: any) => (
              <div key={proposal.id} className="loom-card-compact">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{proposal.title}</h3>
                    {Array.isArray(proposal.proposed_times) && proposal.proposed_times.length > 1 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {proposal.proposed_times.map((slot: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedSlots((prev) => ({ ...prev, [proposal.id]: idx }))}
                            className={`loom-chip text-xs ${
                              (selectedSlots[proposal.id] ?? 0) === idx
                                ? 'loom-chip-primary'
                                : 'border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))]'
                            }`}
                          >
                            {format(parseISO(slot.start_time), 'MMM d, h:mm a')} – {format(parseISO(slot.end_time), 'h:mm a')}
                          </button>
                        ))}
                      </div>
                    ) : (
                      proposal.proposed_times?.length === 1 && (
                        <p className="text-xs sm:text-sm mt-1">
                          {format(parseISO(proposal.proposed_times[0].start_time), 'MMM d, h:mm a')} – {format(parseISO(proposal.proposed_times[0].end_time), 'h:mm a')}
                        </p>
                      )
                    )}
                    {proposal.message && (
                      <p className="text-xs sm:text-sm mt-2 line-clamp-2">{proposal.message}</p>
                    )}
                  </div>
                  {proposal.proposed_to === user?.id && (
                    <div className="flex space-x-2 sm:ml-4">
                      <button
                        onClick={() => {
                          const idx = selectedSlots[proposal.id] ?? 0;
                          const slot = proposal.proposed_times?.[idx] || proposal.proposed_times?.[0];
                          if (slot) {
                            acceptProposalMutation.mutate({
                              proposalId: proposal.id,
                              selectedTimeSlot: { start_time: slot.start_time, end_time: slot.end_time },
                            });
                          }
                        }}
                        disabled={acceptProposalMutation.isPending}
                        className="loom-chip loom-chip-primary text-xs hover-scale"
                      >
                        {acceptProposalMutation.isPending ? t('accepting') : t('accept')}
                      </button>
                      <button
                        onClick={() => declineProposalMutation.mutate(proposal.id)}
                        disabled={declineProposalMutation.isPending}
                        className="loom-chip text-xs hover-scale border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))]"
                      >
                        {declineProposalMutation.isPending ? t('declining') : t('decline')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('acceptedProposals')} variant="card">
        {accepted.length === 0 ? (
          <p className="text-sm opacity-80">{t('noAcceptedProposals')}</p>
        ) : (
          <div className="space-y-3">
            {accepted.map((proposal: any) => (
              <div key={proposal.id} className="loom-card-compact">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{proposal.title}</h3>
                    {proposal.accepted_time_slot && (
                      <p className="text-xs sm:text-sm">
                        {format(parseISO(proposal.accepted_time_slot.start_time), 'MMM d, h:mm a')} – {format(parseISO(proposal.accepted_time_slot.end_time), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t('declinedProposals')} variant="card">
        {declined.length === 0 ? (
          <p className="text-sm opacity-80">{t('noDeclinedProposals')}</p>
        ) : (
          <div className="space-y-3">
            {declined.map((proposal: any) => (
              <div key={proposal.id} className="loom-card-compact">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{proposal.title}</h3>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
