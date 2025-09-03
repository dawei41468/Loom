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

const Partner = () => {
  const [email, setEmail] = useState('');
  const { user, partner } = useAuthState();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: (email: string) => apiClient.invitePartner(email),
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Invitation sent!',
        description: 'Partner invitation has been sent.',
      });
      setEmail('');
      // Invalidate partner query to refresh data
      queryClient.invalidateQueries({ queryKey: ['partner'] });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Failed to send invitation',
        description: error.message,
      });
    },
  });

  if (partner) {
    return (
      <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
        <PageHeader
          title="Your Partner"
          subtitle={partner.display_name}
        />

        <Section variant="elevated" className="loom-gradient-subtle">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-full loom-gradient-primary flex items-center justify-center flex-shrink-0">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg text-[hsl(var(--loom-text))]">{partner.display_name}</h3>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">Connected since {new Date(partner.connected_at || '').toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="loom-card-compact">
              <h4 className="font-medium mb-2">Timezone</h4>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">{partner.timezone}</p>
            </div>
            <div className="loom-card-compact">
              <h4 className="font-medium mb-2">Status</h4>
              <p className="text-sm text-green-600">Active Partner</p>
            </div>
          </div>
        </Section>

        <Section title="Shared Activities">
          <EmptyState
            icon={Heart}
            title="Coming Soon"
            description="Shared activities and partner insights will be available here."
          />
        </Section>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
      <PageHeader
        title="Find Your Partner"
        subtitle="Connect with someone special to share your schedule"
      />

      <Section variant="elevated" className="loom-gradient-subtle">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full loom-gradient-primary flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Invite Your Partner</h3>
          <p className="text-sm text-[hsl(var(--loom-text-muted))] max-w-md mx-auto">
            Send an invitation to connect with your partner and start coordinating your schedules together.
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
                Partner's Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@example.com"
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
                  <span>Sending Invitation...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Send Invitation</span>
                </div>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-[hsl(var(--loom-text-muted))]">
            Your partner will receive an email invitation and can accept to connect your accounts.
          </p>
        </div>
      </Section>

      <Section title="What You'll Share">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--loom-primary-light))] flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <h4 className="font-medium mb-2">Shared Events</h4>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              Coordinate schedules and see each other's events
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--loom-primary-light))] flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <h4 className="font-medium mb-2">Time Proposals</h4>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              Propose meeting times and get instant responses
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--loom-primary-light))] flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <h4 className="font-medium mb-2">Availability Sync</h4>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              Find overlapping free time automatically
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default Partner;