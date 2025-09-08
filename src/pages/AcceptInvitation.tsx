import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Users, Loader2, UserPlus } from 'lucide-react';
import { useAuthState } from '../contexts/AuthContext';
import { partnerQueries } from '@/api/queries';

const AcceptInvitation: React.FC = () => {
  const { id: partnershipId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthState();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid' | 'login_required'>('loading');

  // First, get partnership details to know the invited email
  const { data: partnershipData, isLoading: partnershipLoading } = useQuery({
    queryKey: ['partnership', partnershipId],
    queryFn: async () => {
      if (!partnershipId) return null;
      // We'll need to add a backend endpoint to get partnership details
      // For now, we'll work with the existing accept endpoint
      return null;
    },
    enabled: !!partnershipId && status === 'loading',
  });

  // Check if invited email is registered (we'll need to extract this from partnership)
  const invitedEmail = partnershipData?.invited_email || '';
  const { data: emailCheck, isLoading: emailCheckLoading } = useQuery({
    queryKey: ['email-check', invitedEmail],
    queryFn: () => partnerQueries.checkEmailRegistered(invitedEmail),
    enabled: !!invitedEmail && !isAuthenticated,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => partnerQueries.acceptPartnership(id),
    onSuccess: () => {
      setStatus('success');
      setTimeout(() => navigate('/partner'), 3000);
    },
    onError: (error: any) => {
      console.error('Failed to accept invitation:', error);
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        setStatus('invalid');
      } else {
        setStatus('error');
      }
    },
  });

  useEffect(() => {
    // Check authentication first
    if (!isAuthenticated) {
      setStatus('login_required');
      return;
    }

    if (partnershipId && status === 'loading') {
      acceptMutation.mutate(partnershipId);
    }
  }, [partnershipId, status, isAuthenticated]);

  const handleRetry = () => {
    if (partnershipId) {
      setStatus('loading');
      acceptMutation.mutate(partnershipId);
    }
  };

  const handleLogin = () => {
    // Store the current URL to redirect back after login
    const currentUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirectAfterLogin', currentUrl);
    navigate('/login');
  };

  const handleSignUp = () => {
    // Store invitation context for after registration
    if (partnershipId) {
      sessionStorage.setItem('invitationId', partnershipId);
    }
    navigate('/register');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (status === 'login_required') {
    // Determine if this is a registered email or needs signup
    const isEmailRegistered = emailCheck?.data?.is_registered;
    const needsSignup = !isEmailRegistered;

    if (needsSignup && !emailCheckLoading) {
      // Show signup screen for unregistered users
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Create Account to Accept</h2>
                  <p className="text-gray-600 mt-2">
                    You need to create an account to accept this partnership invitation.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button onClick={handleSignUp} className="w-full">
                    Sign Up to Accept Invitation
                  </Button>
                  <Button onClick={handleGoHome} variant="outline" className="w-full">
                    Go to Home
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  After signing up, you'll be able to accept this invitation and start coordinating with your partner!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show login screen for registered users
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Login Required</h2>
                <p className="text-gray-600 mt-2">
                  You need to be logged in to accept this partnership invitation.
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleLogin} className="w-full">
                  Login to Accept
                </Button>
                <Button onClick={handleGoHome} variant="outline" className="w-full">
                  Go to Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Accepting Invitation</h2>
                <p className="text-gray-600 mt-2">Please wait while we process your partnership invitation...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Partnership Accepted! 🎉</h2>
                <p className="text-gray-600 mt-2">
                  Welcome to the partnership! You can now coordinate schedules and share events with your partner.
                </p>
              </div>
              <Button onClick={handleGoHome} className="w-full">
                Go to Your Dashboard
              </Button>
              <p className="text-sm text-gray-500">Redirecting in 3 seconds...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-center text-xl">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">
              This partnership invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                This could happen if:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>The invitation has already been accepted or declined</li>
                  <li>The link is malformed or expired</li>
                  <li>You don't have permission to accept this invitation</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Button onClick={handleGoHome} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Something Went Wrong</h2>
              <p className="text-gray-600 mt-2">
                We couldn't process your partnership invitation. Please try again.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={handleRetry} variant="outline" className="w-full">
                Try Again
              </Button>
              <Button onClick={handleGoHome} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
