// Login Page - Consistent with Loom brand styling
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuthDispatch } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { apiClient } from '../api/client';
import { UserLogin } from '../types';
import LoomLogo from '../components/LoomLogo';
import { useTranslation } from '../i18n';
import Form from '../components/forms/Form';
import FormField from '../components/forms/FormField';
import TextInput from '../components/forms/TextInput';
import SubmitButton from '../components/forms/SubmitButton';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useAuthDispatch();
  const { addToast } = useToastContext();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const credentials: UserLogin = { email, password };
      console.log('Attempting login with:', credentials);
      const response = await apiClient.login(credentials);
      console.log('Login response:', response);

      if (response) {
        console.log('Login successful, setting tokens and fetching user data...');
        // Set the tokens on the API client before making authenticated requests
        apiClient.setToken(response.access_token);
        apiClient.setRefreshToken(response.refresh_token);
        const userResponse = await apiClient.getMe();
        console.log('User response:', userResponse);

        if (userResponse.data) {
          console.log('User data received, dispatching LOGIN action...');
          dispatch({
            type: 'LOGIN',
            payload: { token: response.access_token, refreshToken: response.refresh_token, user: userResponse.data },
          });
          addToast({
            type: 'success',
            title: 'Welcome back!',
            description: 'You have successfully logged in.',
          });
          
          // If user arrived via invite link, auto-connect to inviter as partner
          try {
            const inviteToken = sessionStorage.getItem('inviteToken');
            if (inviteToken) {
              const connectResp = await apiClient.connectPartner({ invite_token: inviteToken });
              if (connectResp?.data) {
                // We cannot access useAuthDispatch here again; dispatch is available
                dispatch({ type: 'SET_PARTNER', payload: connectResp.data });
                addToast({
                  type: 'success',
                  title: 'Partner connected!',
                  description: `You are now connected with ${connectResp.data.display_name}.`,
                });
              }
            }
          } catch (e) {
            console.error('Auto-connect via invite failed:', e);
            // Non-fatal; continue navigation
          } finally {
            sessionStorage.removeItem('inviteToken');
            sessionStorage.removeItem('inviterInfo');
          }

          // Navigate based on onboarding status
          console.log('User onboarding status:', userResponse.data.is_onboarded);
          if (userResponse.data.is_onboarded) {
            console.log('Navigating to home page...');
            navigate('/');
          } else {
            console.log('Navigating to onboarding page...');
            navigate('/onboarding');
          }
        } else {
          console.error('User response data is null:', userResponse);
        }
      } else {
        console.error('Login response data is null:', response);
      }
    } catch (error) {
      console.error('Login failed:', error);
      addToast({
        type: 'error',
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Invalid email or password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterRedirect = () => {
    navigate('/register');
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
            {t('welcomeToLoom')}
          </h1>
          <p className="text-lg text-[hsl(var(--loom-text-muted))] leading-relaxed md:text-xl">
            <em>weave your days together</em>
          </p>
        </div>

        {/* Login Form */}
        <div className="flex-1 px-6 pb-8 md:px-0 md:pb-12">
          <div className="max-w-md mx-auto md:max-w-lg">
            <div className="loom-card">
            <Form onSubmit={handleSubmit}>
              <FormField label="Email Address" htmlFor="email" required>
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </FormField>

              <FormField label="Password" htmlFor="password" required>
                <div className="relative">
                  <TextInput
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--loom-text-muted))] hover:text-[hsl(var(--loom-text))]"
                    disabled={isLoading}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </FormField>

              <SubmitButton
                isLoading={isLoading}
                disabled={isLoading || !email || !password}
                aria-disabled={isLoading || !email || !password}
              >
                {!isLoading && <LogIn className="w-5 h-5" />}
                <span>{isLoading ? t('signingIn') : t('login')}</span>
              </SubmitButton>
            </Form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[hsl(var(--loom-border))]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text-muted))]">
                New to Loom?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <button
            onClick={handleRegisterRedirect}
            className="w-full text-center text-[hsl(var(--loom-primary))] hover:text-[hsl(var(--loom-primary-dark))] font-medium transition-colors"
            disabled={isLoading}
          >
            {t('createAccount')}
          </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default Login;