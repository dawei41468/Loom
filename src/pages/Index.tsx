// Main Today View - Dashboard
import * as React from 'react';
import { useMemo, useState } from 'react';
import { format, isToday, isTomorrow, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Plus, Clock, MapPin, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { queryKeys, eventQueries, proposalQueries, userQueries, partnerQueries } from '../api/queries';
import { Event as LoomEvent } from '../types';
import { PageHeader } from '../components/ui/page-header';
import { EmptyState } from '../components/ui/empty-state';
import { Section } from '../components/ui/section';
import { useTranslation } from '../i18n';

const Index = () => {
  const navigate = useNavigate();
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // React Query reads: user, partner, events and proposals
  const { data: meData } = useQuery({
    queryKey: queryKeys.user,
    queryFn: userQueries.getMe,
    staleTime: 30_000,
    enabled: true,
  });
  const meUser = meData?.data || user;

  const { data: partnerData } = useQuery({
    queryKey: queryKeys.partner,
    queryFn: partnerQueries.getPartner,
    staleTime: 30_000,
    enabled: true,
  });
  const partnerForDisplay = partnerData?.data || partner;

  // React Query reads: events and proposals
  const { data: events = [] } = useQuery({
    queryKey: queryKeys.events,
    queryFn: eventQueries.getEvents,
    select: (resp) => resp.data ?? [],
    staleTime: 30_000,
  });
  const { data: proposals = [] } = useQuery({
    queryKey: queryKeys.proposals,
    queryFn: proposalQueries.getProposals,
    select: (resp) => resp.data ?? [],
    staleTime: 30_000,
  });

  // Track selected time slot per proposal (index in proposed_times)
  const [selectedSlots, setSelectedSlots] = useState<Record<string, number>>({});

  const acceptProposalMutation = useMutation({
    mutationFn: ({ proposalId, selectedTimeSlot }: {
      proposalId: string;
      selectedTimeSlot: { start_time: string; end_time: string }
    }) => apiClient.acceptProposal(proposalId, selectedTimeSlot),
    onMutate: async ({ proposalId, selectedTimeSlot }) => {
      // Cancel queries to avoid races
      await queryClient.cancelQueries({ queryKey: queryKeys.proposals });
      await queryClient.cancelQueries({ queryKey: queryKeys.events });

      // Snapshot previous
      const prevProposals = queryClient.getQueryData<any>(queryKeys.proposals);
      const prevEvents = queryClient.getQueryData<any>(queryKeys.events);

      // Optimistically update proposal status
      queryClient.setQueryData<any>(queryKeys.proposals, (old: any) => {
        const list = old?.data ?? old ?? [];
        const next = list.map((p: any) =>
          String(p.id) === String(proposalId)
            ? { ...p, status: 'accepted', accepted_time_slot: selectedTimeSlot }
            : p
        );
        return old?.data ? { ...old, data: next } : next;
      });

      return { prevProposals, prevEvents };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback proposals cache
      if (context?.prevProposals !== undefined) {
        queryClient.setQueryData(queryKeys.proposals, context.prevProposals);
      }
      addToast({
        type: 'error',
        title: t('failedToAcceptProposal'),
        description: error.message,
      });
    },
    onSuccess: (resp) => {
      // Reconcile with server response: proposals + add created event
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
        queryClient.setQueryData<any>(queryKeys.events, (old: any) => {
          const list = old?.data ?? old ?? [];
          const next = [...list, createdEvent];
          return old?.data ? { ...old, data: next } : next;
        });
      }
      addToast({
        type: 'success',
        title: t('proposalAccepted'),
        description: t('newEventCreated'),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    }
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
    onError: (error: Error, _proposalId, context) => {
      if (context?.prevProposals !== undefined) {
        queryClient.setQueryData(queryKeys.proposals, context.prevProposals);
      }
      addToast({
        type: 'error',
        title: t('failedToDeclineProposal'),
        description: error.message,
      });
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
      addToast({
        type: 'info',
        title: t('proposalDeclined'),
        description: t('proposalHasBeenDeclined'),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals });
    }
  });

  // Initial data now loaded via React Query

  const todayEvents = useMemo(() => {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);
    
    return events
      .filter(event => {
        const eventStart = parseISO(event.start_time);
        return isWithinInterval(eventStart, { start: dayStart, end: dayEnd });
      })
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
  }, [events]);

  const nextEvent = useMemo(() => {
    const now = new Date();
    return events
      .filter(event => parseISO(event.start_time) > now)
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())[0];
  }, [events]);

  const pendingProposals = React.useMemo(() => proposals.filter(p => p.status === 'pending'), [proposals]);

  const getEventType = React.useCallback((event: LoomEvent): 'user' | 'partner' | 'shared' => {
    if (event.attendees.length > 1) return 'shared';
    if (event.created_by === meUser?.id) return 'user';
    return 'partner';
  }, [meUser?.id]);

  const formatEventTime = React.useCallback((event: LoomEvent) => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  }, []);

  const getNextUpText = (event: LoomEvent) => {
    const start = parseISO(event.start_time);
    if (isToday(start)) return t('taskToday');
    if (isTomorrow(start)) return t('tomorrow');
    return format(start, 'MM/dd/yyyy');
  };

  return (
    <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Enhanced Header */}
      <PageHeader
        title={format(new Date(), 'MM/dd/yyyy')}
        subtitle={partnerForDisplay ? `${t('youAnd')} ${partnerForDisplay.display_name}` : t('yourSchedule')}
      />

      {/* Next Up Card - Enhanced */}
      {nextEvent && (
        <Section variant="elevated" className="loom-gradient-subtle">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full loom-gradient-primary flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[hsl(var(--loom-text))] truncate">{t('nextUp')}</h3>
              <p className="text-sm text-[hsl(var(--loom-text-muted))] truncate">{getNextUpText(nextEvent)}</p>
            </div>
          </div>
          <div className={`event-block-${getEventType(nextEvent)} mb-4`}>
            <h3 className="font-semibold text-base sm:text-lg mb-1 line-clamp-2">{nextEvent.title}</h3>
            <p className="loom-text-muted mb-2 text-sm">{formatEventTime(nextEvent)}</p>
            {nextEvent.location && (
              <div className="flex items-center space-x-2 mt-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">{nextEvent.location}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(`/event/${nextEvent.id}`)}
            className="loom-btn-ghost text-sm hover-scale w-full sm:w-auto"
          >
            {t('viewDetails')}
          </button>
        </Section>
      )}

      {/* Pending Proposals - Enhanced */}
      {pendingProposals.length > 0 && (
        <Section
          title={t('pendingProposals')}
          variant="card"
        >
          <div className="space-y-3">
            {pendingProposals.map((proposal) => (
              <div
                key={proposal.id}
                className="loom-card-compact hover-scale bg-[hsl(var(--loom-warning-light))] border-[hsl(var(--loom-warning)/0.2)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{proposal.title}</h3>
                    <p className="loom-text-muted text-xs sm:text-sm">
                      {t('from')} {proposal.proposed_by === user?.id ? t('you') : partner?.display_name}
                    </p>
                    {proposal.proposed_times?.length > 1 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {proposal.proposed_times.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              setSelectedSlots((prev) => ({ ...prev, [proposal.id]: idx }))
                            }
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
                    )}
                    {proposal.proposed_times?.length === 1 && (
                      <p className="text-xs sm:text-sm mt-2">
                        {format(parseISO(proposal.proposed_times[0].start_time), 'MMM d, h:mm a')} – {format(parseISO(proposal.proposed_times[0].end_time), 'h:mm a')}
                      </p>
                    )}
                    {proposal.message && (
                      <p className="text-xs sm:text-sm mt-2 line-clamp-2">{proposal.message}</p>
                    )}
                  </div>
                  {/* Only the recipient should see Accept/Decline */}
                  {proposal.proposed_to === user?.id && (
                    <div className="flex space-x-2 sm:ml-4">
                      <button
                        onClick={() => {
                          const idx = selectedSlots[proposal.id] ?? 0;
                          const slot = proposal.proposed_times[idx] || proposal.proposed_times[0];
                          if (slot) {
                            acceptProposalMutation.mutate({
                              proposalId: proposal.id,
                              selectedTimeSlot: {
                                start_time: slot.start_time,
                                end_time: slot.end_time,
                              },
                            });
                          }
                        }}
                        disabled={acceptProposalMutation.isPending}
                        className="loom-chip loom-chip-primary text-xs hover-scale flex-1 sm:flex-initial"
                      >
                        {acceptProposalMutation.isPending ? t('accepting') : t('accept')}
                      </button>
                      <button
                        onClick={() => declineProposalMutation.mutate(proposal.id)}
                        disabled={declineProposalMutation.isPending}
                        className="loom-chip text-xs hover-scale border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] flex-1 sm:flex-initial"
                      >
                        {declineProposalMutation.isPending ? t('declining') : t('decline')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Today's Timeline - Enhanced */}
      <Section
        title={t('todaysSchedule')}
        variant="card"
      >
        {todayEvents.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={t('noEventsToday')}
            description={t('timeToGather')}
            action={
              <button
                onClick={() => navigate('/add')}
                className="loom-btn-primary hover-scale"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('addEvent')}
              </button>
            }
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {todayEvents.map((event) => {
              const eventType = getEventType(event);
              return (
                <div
                  key={event.id}
                  className="mobile-event-item cursor-pointer hover:bg-[hsl(var(--loom-border)/0.3)] rounded-[var(--loom-radius-lg)] p-3 -m-3 transition-all duration-200 hover-scale"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  <div className={`event-block-${eventType} flex items-start justify-between`}>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{event.title}</h3>
                      <p className="text-xs sm:text-sm opacity-90 mt-1 line-clamp-1">
                        {formatEventTime(event)}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                    <div className="ml-2 mr-2 flex items-center justify-end">
                      {event.attendees.length > 1 ? (
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Quick Actions - Enhanced */}
      <Section title={t('quickActions')}>
        <div className="mobile-quick-actions grid grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/add')}
            className="loom-btn-primary flex flex-col items-center space-y-2 sm:space-y-3 py-4 sm:py-6 hover-lift min-h-[80px] sm:min-h-[100px]"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="font-semibold text-sm sm:text-base">{t('addEvent')}</span>
          </button>
          <button
            onClick={() => navigate('/add?type=proposal')}
            className="loom-btn-secondary flex flex-col items-center space-y-2 sm:space-y-3 py-4 sm:py-6 hover-lift min-h-[80px] sm:min-h-[100px]"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="font-semibold text-sm sm:text-base">{t('propose')}</span>
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="loom-btn-ghost flex flex-col items-center space-y-2 sm:space-y-3 py-4 sm:py-6 hover-lift border border-[hsl(var(--loom-border))] min-h-[80px] sm:min-h-[100px]"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[hsl(var(--loom-primary-light))] flex items-center justify-center">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <span className="font-semibold text-sm sm:text-base">{t('calendar')}</span>
          </button>
        </div>
      </Section>
    </div>
  );
};

export default Index;
