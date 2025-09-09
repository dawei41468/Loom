// Onboarding Page - Multi-step flow with app introduction and optional partner connection
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Copy, Check as CheckIcon } from 'lucide-react';
import { useAuthState, useAuthDispatch } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { partnerQueries } from '@/api/queries';
import { useTranslation } from '../i18n';
import AppIntroduction from '../components/AppIntroduction';

const Onboarding = () => {
  const { user } = useAuthState();
  const dispatch = useAuthDispatch();
  const navigate = useNavigate();
  const { addToast } = useToastContext();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState<'introduction' | 'partner'>('introduction');
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate invite token when component mounts
  useEffect(() => {
    const generateInviteLink = async () => {
      try {
        const response = await partnerQueries.generateInviteToken();
        if (response.data?.invite_url) {
          setInviteUrl(response.data.invite_url);
        }
      } catch (error) {
        console.error('Failed to generate invite link:', error);
        // Fallback to a generic invite URL
        setInviteUrl('https://loom.studiodtw.net/invite/request');
      }
    };

    generateInviteLink();
  }, []);

  const handleIntroductionComplete = () => {
    setCurrentStep('partner');
  };

  const handleSkipPartner = async () => {
    await completeOnboarding(false);
  };

  const handlePartnerComplete = async () => {
    await completeOnboarding(true);
  };

  const completeOnboarding = async (sendInvite: boolean) => {
    setIsLoading(true);
    try {
      // Update user as onboarded
      await apiClient.updateMe({ is_onboarded: true });

      // Show success message
      addToast({
        type: 'success',
        title: 'Welcome to Loom! 🎉',
        description: sendInvite
          ? 'Your invite link is ready to share with your partner. Check the link above!'
          : 'You can connect with a partner anytime from the Partner page.',
      });

      dispatch({ type: 'SET_ONBOARDED', payload: true });

      navigate('/');
    } catch (error) {
      console.error('Onboarding failed:', error);
      addToast({
        type: 'error',
        title: 'Onboarding failed',
        description: 'Could not complete onboarding. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    const urlToCopy = inviteUrl || 'https://loom.studiodtw.net/invite/request';

    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedInvite(true);
      addToast({
        type: 'success',
        title: 'Invite link copied!',
        description: 'Share this with your partner to connect.',
      });

      setTimeout(() => setCopiedInvite(false), 2000);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
      });
    }
  };

  const handleBackToIntroduction = () => {
    setCurrentStep('introduction');
  };

  return (
    <>
      {currentStep === 'introduction' ? (
        <AppIntroduction onContinue={handleIntroductionComplete} />
      ) : (
        <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
          <div className="loom-card max-w-md w-full">
            {/* Header with back button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBackToIntroduction}
                className="p-2 hover:bg-[hsl(var(--loom-border))] rounded-md transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-20 h-20 mx-auto rounded-full loom-gradient-hero flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
              <div className="w-8" /> {/* Spacer for centering */}
            </div>

            <h1 className="text-2xl font-semibold text-[hsl(var(--loom-text))] mb-2 text-center">
              Connect with Your Partner
            </h1>
            <p className="text-sm text-[hsl(var(--loom-text-muted))] leading-relaxed mb-8 text-center">
              Optional: Invite your partner to coordinate schedules and share tasks together.
            </p>

            <div className="space-y-6">
              {/* Invite Link Display */}
              <div>
                <label className="block text-sm font-medium mb-2 text-[hsl(var(--loom-text))]">
                  Your Invite Link
                </label>
                <div className="flex items-center space-x-2 p-3 rounded-[var(--loom-radius-md)] bg-[hsl(var(--loom-surface))] border mb-4">
                  <code className="flex-1 text-sm font-mono overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-[hsl(var(--loom-border))] scrollbar-track-transparent">
                    {inviteUrl || 'Generating invite link...'}
                  </code>
                  <button
                    onClick={handleCopyInvite}
                    className="p-2 hover:bg-[hsl(var(--loom-border))] rounded-md transition-colors disabled:opacity-50"
                    disabled={!inviteUrl || isLoading}
                  >
                    {copiedInvite ? (
                      <CheckIcon className="w-4 h-4 text-[hsl(var(--loom-success))]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-[hsl(var(--loom-text-muted))]">
                  Copy this link and send it to your partner to connect your accounts.
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={handlePartnerComplete}
                  disabled={isLoading || !inviteUrl}
                  className="loom-btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Setting up...' : 'Continue with Invite Link'}</span>
                  {!isLoading && <ArrowRight className="w-5 h-5" />}
                </button>

                <button
                  onClick={handleSkipPartner}
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-sm text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))] transition-colors disabled:opacity-50"
                >
                  Skip for now - I'll connect later
                </button>
              </div>

              {/* Info about connecting later */}
              <div className="text-center p-4 bg-[hsl(var(--loom-surface))] rounded-lg border border-[hsl(var(--loom-border))]">
                <p className="text-xs text-[hsl(var(--loom-text-muted))]">
                  💡 You can always generate a new invite link from the Partner page anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Onboarding;