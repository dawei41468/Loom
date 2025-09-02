// Onboarding Page - Consistent with Loom brand styling
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { useAuthState, useAuthDispatch } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';

const Onboarding = () => {
  const { user } = useAuthState();
  const dispatch = useAuthDispatch();
  const navigate = useNavigate();
  const { addToast } = useToastContext();
  
  const [partnerEmail, setPartnerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOnboardingComplete = async () => {
    setIsLoading(true);
    try {
      // This is a mock API call. In a real app, you'd send the partner email.
      await apiClient.updateMe({ is_onboarded: true });
      
      dispatch({ type: 'SET_ONBOARDED', payload: true });
      
      addToast({
        type: 'success',
        title: 'Onboarding Complete!',
        description: 'Welcome to Loom!',
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
          Welcome, {user?.display_name || 'friend'}!
        </h1>
        <p className="text-lg text-[hsl(var(--loom-text-muted))] leading-relaxed mb-8">
          Let's get your Loom set up.
        </p>

        <div className="space-y-6 text-left">
          <div>
            <label className="block text-sm font-medium mb-2 text-[hsl(var(--loom-text))]">
              Connect with your partner
            </label>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="Enter your partner's email (optional)"
              className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-[hsl(var(--loom-text-muted))] mt-2">
              We'll send an invitation to help you both get started.
            </p>
          </div>
        </div>

        <button
          onClick={handleOnboardingComplete}
          disabled={isLoading}
          className="loom-btn-primary w-full flex items-center justify-center space-x-2 mt-8 disabled:opacity-50"
        >
          <span>{isLoading ? 'Finishing up...' : 'Complete Setup'}</span>
          {!isLoading && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;