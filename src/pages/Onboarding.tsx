// Onboarding Page - Consistent with Loom brand styling
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { useAuthState, useAuthDispatch } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { useTranslation } from '../i18n';

const Onboarding = () => {
  const { user } = useAuthState();
  const dispatch = useAuthDispatch();
  const navigate = useNavigate();
  const { addToast } = useToastContext();
  const { t } = useTranslation();
  
  const [partnerEmail, setPartnerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOnboardingComplete = async () => {
    setIsLoading(true);
    try {
      // Update user as onboarded
      await apiClient.updateMe({ is_onboarded: true });
      
      // If partner email is provided, send invitation
      if (partnerEmail.trim()) {
        try {
          const result = await apiClient.invitePartner(partnerEmail.trim());
          addToast({
            type: 'success',
            title: 'Partner invitation sent!',
            description: `We've sent an invitation to ${partnerEmail}`,
          });
        } catch (inviteError) {
          console.error('Failed to send partner invitation:', inviteError);
          addToast({
            type: 'warning',
            title: 'Onboarding complete',
            description: 'Partner invitation failed, but you can invite them later from the Partner page.',
          });
        }
      }
      
      dispatch({ type: 'SET_ONBOARDED', payload: true });
      
      addToast({
        type: 'success',
        title: 'Onboarding Complete!',
        description: partnerEmail.trim() 
          ? 'Welcome to Loom! Your partner invitation has been sent.' 
          : 'Welcome to Loom!',
      });
      
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

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex flex-col items-center justify-center p-6 safe-area-top safe-area-bottom">
      <div className="loom-card max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto rounded-full loom-gradient-hero flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--loom-text))] mb-2">
          {t('welcomeFriend').replace('{name}', user?.display_name || t('friend'))}
        </h1>
        <p className="text-lg text-[hsl(var(--loom-text-muted))] leading-relaxed mb-8">
          {t('letsGetLoomSetup')}
        </p>

        <div className="space-y-6 text-left">
          <div>
            <label className="block text-sm font-medium mb-2 text-[hsl(var(--loom-text))]">
              {t('connectWithYourPartner')}
            </label>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder={t('enterPartnersEmailOptional')}
              className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-[hsl(var(--loom-text-muted))] mt-2">
              {t('wellSendInvitation')}
            </p>
          </div>
        </div>

        <button
          onClick={handleOnboardingComplete}
          disabled={isLoading}
          className="loom-btn-primary w-full flex items-center justify-center space-x-2 mt-8 disabled:opacity-50"
        >
          <span>{isLoading ? t('finishingUp') : t('completeSetup')}</span>
          {!isLoading && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;