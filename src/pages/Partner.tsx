// Partner Management Page
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, QrCode, Camera, Copy, Check } from 'lucide-react';
import { useAuthState, useAuthDispatch } from '../contexts/AuthContext';
import { useToastContext } from '../contexts/ToastContext';
import { partnerQueries } from '@/api/queries';
import { Partner as PartnerType } from '../types';
import { PageHeader } from '../components/ui/page-header';
import { Section } from '../components/ui/section';
import { EmptyState } from '../components/ui/empty-state';
import { useTranslation } from '../i18n';
import QRCodeModal from '../components/QRCodeModal';
import QRScannerModal from '../components/QRScannerModal';

const Partner = () => {
  const { user, partner } = useAuthState();
  const authDispatch = useAuthDispatch();
  const { addToast } = useToastContext();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // QR Code functionality state
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const { data: partnerData, isLoading: isLoadingPartner } = useQuery({
    queryKey: ['partner'],
    queryFn: partnerQueries.getPartner,
    enabled: !!user,
  });

  const connectPartnerMutation = useMutation({
    mutationFn: (token: { invite_token: string }) => partnerQueries.connectPartner(token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      authDispatch({ type: 'SET_PARTNER', payload: data.data as PartnerType });
      addToast({
        type: 'success',
        title: t('partnerConnected'),
        description: t('connectedWithPartner'),
      });
      setShowQRScanner(false);
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: t('connectionFailed'),
        description: error?.message || t('failedToConnectPartner'),
      });
    },
  });

  // Generate invite token on component mount
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

    if (!partnerData?.data) {
      generateInviteLink();
    }
  }, [partnerData?.data]);


  const handleCopyInvite = async () => {
    const urlToCopy = inviteUrl || 'https://loom.studiodtw.net/invite/request';

    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedInvite(true);
      addToast({
        type: 'success',
        title: t('inviteLinkCopied'),
        description: t('shareWithPartnerToConnect'),
      });

      setTimeout(() => setCopiedInvite(false), 2000);
    } catch (error) {
      addToast({
        type: 'error',
        title: t('failedToCopy'),
        description: t('pleaseCopyLinkManually'),
      });
    }
  };

  const handleShowQRCode = () => {
    setShowQRModal(true);
  };

  const handleScanQRCode = () => {
    setShowQRScanner(true);
  };

  const handleQRScanSuccess = async (scannedData: string) => {
    setShowQRScanner(false);

    // Check if the scanned data is a Loom invite URL
    if (scannedData.includes('/invite/')) {
      // Extract the token from the URL
      const tokenMatch = scannedData.match(/\/invite\/([^/?]+)/);
      if (tokenMatch) {
        const token = tokenMatch[1];

        // If user is already authenticated, auto-connect them
        if (user) {
          try {
            // First, check if the invite token is valid and get inviter info
            const checkResponse = await partnerQueries.checkInviteToken(token);

            if (checkResponse.data) {
              connectPartnerMutation.mutate({ invite_token: token });
            } else {
              addToast({
                type: 'error',
                title: t('invalidInvite'),
                description: t('invalidInviteDesc'),
              });
            }
          } catch (error) {
            console.error('Auto-connect failed:', error);
            addToast({
              type: 'error',
              title: t('connectionFailed'),
              description: t('unableToConnect'),
            });
          }
        } else {
          addToast({
            type: 'error',
            title: t('authenticationRequired'),
            description: t('pleaseLoginToConnect'),
          });
        }
      } else {
        addToast({
          type: 'error',
          title: t('invalidQrCode'),
          description: t('invalidQrCodeDesc'),
        });
      }
    } else {
      addToast({
        type: 'info',
        title: t('qrCodeScanned'),
        description: `${t('scannedPrefix')} ${scannedData.substring(0, 50)}${scannedData.length > 50 ? '...' : ''}`,
      });
    }
  };

  if (isLoadingPartner) {
    return (
      <div className="container py-4 sm:py-8 space-y-6 sm:space-y-8">
        <PageHeader
          title={t('yourPartner')}
          subtitle={t('loading')}
        />
        <Section variant="elevated" className="loom-gradient-subtle">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="min-w-0 flex-1">
              <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-2 animate-pulse"></div>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  if (partnerData?.data) {
    const partner = partnerData.data;
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

      {/* Invite Link Display */}
      {!partnerData?.data && inviteUrl && (
        <Section variant="elevated" className="loom-gradient-subtle">
          <div className="text-center mb-4">
            <h3 className="font-semibold text-lg mb-2">{t('shareInviteLink')}</h3>
            <p className="text-sm text-[hsl(var(--loom-text-muted))] max-w-md mx-auto mb-4">
              {t('shareInviteLinkDesc')}
            </p>
          </div>

          <div className="flex items-center space-x-2 p-3 rounded-[var(--loom-radius-md)] bg-[hsl(var(--loom-surface))] border mb-4">
            <code className="flex-1 text-sm font-mono overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-[hsl(var(--loom-border))] scrollbar-track-transparent">
              {inviteUrl}
            </code>
            <button
              onClick={handleCopyInvite}
              className="p-2 hover:bg-[hsl(var(--loom-border))] rounded-md transition-colors"
            >
              {copiedInvite ? (
                <Check className="w-4 h-4 text-[hsl(var(--loom-success))]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* QR Code Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button className="loom-btn-ghost flex items-center justify-center space-x-2" onClick={handleShowQRCode}>
              <QrCode className="w-4 h-4" />
              <span>{t('showQrCode')}</span>
            </button>
            <button className="loom-btn-ghost flex items-center justify-center space-x-2" onClick={handleScanQRCode}>
              <Camera className="w-4 h-4" />
              <span>{t('scanQrCode')}</span>
            </button>
          </div>
        </Section>
      )}


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
              <Heart className="w-6 h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <h4 className="font-medium mb-2">{t('timeProposals')}</h4>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              {t('proposeMeetingTimes')}
            </p>
          </div>

          <div className="text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--loom-primary-light))] flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-[hsl(var(--loom-primary))]" />
            </div>
            <h4 className="font-medium mb-2">{t('availabilitySync')}</h4>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              {t('findOverlappingFreeTime')}
            </p>
          </div>
        </div>
      </Section>

      {/* QR Code Modals */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        inviteUrl={inviteUrl}
        title={t('yourInviteQrCode')}
      />

      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleQRScanSuccess}
        title={t('scanQrCode')}
      />
    </div>
  );
};

export default Partner;