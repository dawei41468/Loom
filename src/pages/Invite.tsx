import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Users, Loader2, UserPlus } from 'lucide-react';
import { useTranslation } from '../i18n';
import { partnerQueries } from '@/api/queries';

const Invite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading');

  // Check if the invite token is valid
  const { data: inviteData, isLoading, error } = useQuery({
    queryKey: ['invite-check', token],
    queryFn: () => partnerQueries.checkInviteToken(token!),
    enabled: !!token,
    retry: false,
  });

  // Handle successful invite check
  useEffect(() => {
    if (inviteData?.data) {
      setStatus('valid');
      // Store invite context in sessionStorage for signup
      sessionStorage.setItem('inviteToken', token!);
      sessionStorage.setItem('inviterInfo', JSON.stringify(inviteData.data.inviter));
    }
  }, [inviteData, token]);

  // Handle invite check errors
  useEffect(() => {
    if (error) {
      const apiError = error as any;
      if (apiError?.response?.status === 404) {
        setStatus('invalid');
      } else {
        setStatus('expired');
      }
    }
  }, [error]);

  const handleSignUp = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Checking Invitation</h2>
                <p className="text-gray-600 mt-2">Please wait while we verify your invite...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'valid' && inviteData?.data) {
    const inviter = inviteData.data.inviter;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">You've Been Invited!</h2>
                <p className="text-gray-600 mt-2">
                  <strong>{inviter.display_name}</strong> has invited you to join them on Loom and become partners.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Once you sign up, you'll be automatically connected and can start coordinating schedules together.
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleSignUp} className="w-full">
                  Sign Up to Connect
                </Button>
                <Button onClick={handleLogin} variant="outline" className="w-full">
                  Already have an account? Login
                </Button>
              </div>
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
              This invitation link is invalid or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                This could happen if:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>The invitation has already been used</li>
                  <li>The link is malformed</li>
                  <li>The invitation was cancelled by the sender</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Button onClick={handleGoHome} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired or other error
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Invitation Expired</h2>
              <p className="text-gray-600 mt-2">
                This invitation link has expired. Please ask your partner to send you a new invitation.
              </p>
            </div>
            <Button onClick={handleGoHome} className="w-full">
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invite;
