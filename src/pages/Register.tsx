// Register Page - Consistent with Loom brand styling
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuthDispatch } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { UserCreate } from '../types';
import LoomLogo from '../components/LoomLogo';
import { useTranslation } from '../i18n';

const Register = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useAuthDispatch();
  const { addToast } = useToastContext();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const userData: UserCreate = {
        email,
        display_name: displayName,
        password,
        color_preference: 'user',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: 'en',
      };

      const response = await apiClient.register(userData);

      if (response.data) {
        // Auto-login after successful registration
        const loginResponse = await apiClient.login({ email, password });
        
        if (loginResponse) {
          // Set the tokens on the API client before making authenticated requests
          apiClient.setToken(loginResponse.access_token);
          apiClient.setRefreshToken(loginResponse.refresh_token);
          const userResponse = await apiClient.getMe();

          if (userResponse.data) {
            dispatch({
              type: 'LOGIN',
              payload: { token: loginResponse.access_token, refreshToken: loginResponse.refresh_token, user: userResponse.data },
            });
            addToast({
              type: 'success',
              title: 'Welcome to Loom!',
              description: 'Your account has been created successfully.',
            });
            
            // Navigate based on onboarding status
            if (userResponse.data.is_onboarded) {
              navigate('/');
            } else {
              navigate('/onboarding');
            }
          }
        }
      }
    } catch (error) {
      console.error('Registration failed:', error);
      addToast({
        type: 'error',
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Please try again with different credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--loom-bg))] flex flex-col safe-area-top">
      {/* Centered content container for desktop */}
      <div className="w-full max-w-2xl mx-auto md:px-8">
        {/* Header */}
        <div className="px-6 py-8 text-center md:px-0 md:py-12">
          <div className="mb-8 flex justify-center">
            <div className="scale-125">
              <LoomLogo size="lg" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-[hsl(var(--loom-text))] mb-2 md:text-4xl">
            {t('joinLoom')}
          </h1>
          <p className="text-lg text-[hsl(var(--loom-text-muted))] leading-relaxed md:text-xl">
            <em>weave your days together</em>
          </p>
        </div>

        {/* Registration Form */}
        <div className="flex-1 px-6 pb-8 md:px-0 md:pb-12">
          <div className="max-w-md mx-auto md:max-w-lg">
            <div className="loom-card">
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-[hsl(var(--loom-text))]">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="What should we call you?"
                required
                className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[hsl(var(--loom-text))]">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[hsl(var(--loom-text))]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[hsl(var(--loom-text))]">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !displayName || !password || !confirmPassword}
              className="loom-btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              <span>{isLoading ? t('creatingAccount') : t('createAccount')}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[hsl(var(--loom-border))]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text-muted))]">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <button
            onClick={handleLoginRedirect}
            className="w-full text-center text-[hsl(var(--loom-primary))] hover:text-[hsl(var(--loom-primary-dark))] font-medium transition-colors"
            disabled={isLoading}
          >
            {t('signIn')}
          </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default Register;