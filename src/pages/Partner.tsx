// Partner Management Page
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Mail, UserPlus } from 'lucide-react';
import { useAuthState } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { PageHeader } from '../components/ui/page-header';
import { Section } from '../components/ui/section';
import { EmptyState } from '../components/ui/empty-state';
import { useTranslation } from '../i18n';

const Partner = () => {
  const [email, setEmail] = useState('');
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const inviteMutation = useMutation({
    mutationFn: (email: string) => apiClient.invitePartner(email),
    onSuccess: () => {
      addToast({
        type: 'success',
        title: t('invitationSent'),
        description: t('partnerInvitationSent'),
      });
      setEmail('');
      // Invalidate partner query to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner'] });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: t('failedToSendInvitation'),
        description: error.message,
      });
    },
  });

  if (partner) {
    return (
      <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
        <PageHeader
          title={t('yourPartner')}
          subtitle={partner.display_name}
        />

        <Section variant="elevated" className="loom-gradient-subtle">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-full loom-gradient-primary flex items-center justify-center flex-shrink-0">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg text-[hsl(var(--loom-text))]">{partner.display_name}</h3>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">{t('connectedSince')} {new Date(partner.connected_at || '').toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="loom-card-compact">
              <h4 className="font-medium mb-2">{t('timezone')}</h4>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">{partner.timezone}</p>
            </div>
            <div className="loom-card-compact">
              <h4 className="font-medium mb-2">{t('status')}</h4>
              <p className="text-sm text-green-600">{t('activePartner')}</p>
            </div>
          </div>
        </Section>

        <Section title={t('sharedActivities')}>
          <EmptyState
            icon={Heart}
            title={t('comingSoon')}
            description={t('sharedActivitiesDescription')}
          />
        </Section>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
      <PageHeader
        title={t('findYourPartner')}
        subtitle={t('connectWithSomeoneSpecial')}
      />

      <Section variant="elevated" className="loom-gradient-subtle">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full loom-gradient-primary flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-2">{t('inviteYourPartner')}</h3>
          <p className="text-sm text-[hsl(var(--loom-text-muted))] max-w-md mx-auto">
            {t('sendInvitationDescription')}
          </p>
        </div>

        <div className="loom-card max-w-md mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) {
                inviteMutation.mutate(email.trim());
              }
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                {t('partnersEmailAddress')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('partnerExampleEmail')}
                className="w-full px-4 py-3 rounded-md border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
                required
                disabled={inviteMutation.isPending}
              />
            </div>

            <button
              type="submit"
              disabled={inviteMutation.isPending || !email.trim()}
              className="loom-btn-primary w-full hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteMutation.isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('sendingInvitation')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{t('sendInvitation')}</span>
                </div>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-[hsl(var(--loom-text-muted))]">
            {t('partnerWillReceiveEmail')}
          </p>
        </div>
      </Section>

      <Section title={t('whatYouWillShare')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--loom-primary-light))] flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <h4 className="font-medium mb-2">{t('sharedEvents')}</h4>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              {t('coordinateSchedules')}
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--loom-primary-light))] flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <h4 className="font-medium mb-2">{t('timeProposals')}</h4>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              {t('proposeMeetingTimes')}
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--loom-primary-light))] flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <h4 className="font-medium mb-2">{t('availabilitySync')}</h4>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              {t('findOverlappingFreeTime')}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default Partner;