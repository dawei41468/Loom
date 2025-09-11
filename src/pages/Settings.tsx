// Settings Page
import React, { useState, useEffect } from 'react';
import {
  Globe,
  Moon,
  Sun,
  Monitor,
  Info,
  LogOut,
  Users,
  UserX
} from 'lucide-react';
import { useAuthState, useAuthDispatch, useUpdateProfile } from '../contexts/AuthContext';
import { useTheme, useLanguage, useUIActions } from '../contexts/UIContext';
import { useToastContext } from '../contexts/ToastContext';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18n';
import FormField from '../components/forms/FormField';
import TextInput from '../components/forms/TextInput';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerQueries } from '../api/queries';
import { Partner } from '../types';
const Settings = () => {
  const { user } = useAuthState();
  const authDispatch = useAuthDispatch();
  const { updateProfile, isUpdating } = useUpdateProfile();
  const theme = useTheme();
  const language = useLanguage();
  const { setTheme, setLanguage } = useUIActions();
  const { addToast } = useToastContext();
  const { t } = useTranslation();
  const [displayNameInput, setDisplayNameInput] = useState(user?.display_name || '');

  // Partner queries
  const { data: partnerData, isLoading: isLoadingPartner } = useQuery({
    queryKey: ['partner'],
    queryFn: partnerQueries.getPartner,
    refetchOnWindowFocus: false,
  });

  const queryClient = useQueryClient();

  const disconnectMutation = useMutation({
    mutationFn: partnerQueries.disconnectPartner,
    onSuccess: () => {
      // Invalidate partner query to refetch
      queryClient.invalidateQueries({ queryKey: ['partner'] });
      addToast({
        type: 'success',
        title: t('partnerDisconnected'),
        description: t('disconnectedFromPartner'),
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: t('disconnectFailed'),
        description: error?.message || t('failedToDisconnect'),
      });
    },
  });

  // Debounced display name update
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (displayNameInput !== user?.display_name && displayNameInput.trim() !== '' && !isUpdating) {
        try {
          await updateProfile({ display_name: displayNameInput });
          addToast({
            type: 'success',
            title: t('profileUpdated'),
            description: t('displayNameSaved'),
          });
        } catch (error) {
          addToast({
            type: 'error',
            title: t('error'),
            description: t('failedToUpdateDisplayName'),
          });
        }
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timeoutId);
  }, [displayNameInput, user?.display_name, updateProfile, isUpdating, addToast]);

  // Update local state when user data changes
  useEffect(() => {
    if (user?.display_name && user.display_name !== displayNameInput) {
      setDisplayNameInput(user.display_name);
    }
  }, [user?.display_name, displayNameInput]);

  const handleLogout = () => {
    authDispatch({ type: 'LOGOUT' });
    addToast({
      type: 'info',
      title: t('loggedOut'),
      description: t('loggedOutDesc'),
    });
  };

  const handleDisconnectPartner = () => {
    if (window.confirm(t('confirmDisconnectPartner'))) {
      disconnectMutation.mutate();
    }
  };

  const handleUpdateProfile = async (field: string, value: string) => {
    if (user && !isUpdating) {
      try {
        await updateProfile({ [field]: value });
        addToast({
          type: 'success',
          title: t('profileUpdated'),
          description: field === 'color_preference' ? t('colorPreferenceSaved') : t('profileSaved'),
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: t('error'),
          description: t('failedToUpdateProfile'),
        });
      }
    }
  };

  const themeOptions = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
  ];

  const languageOptions = [
    { value: 'en', label: t('english'), flag: '🇺🇸' },
    { value: 'zh', label: t('chinese'), flag: '🇨🇳' },
  ];

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold">{t('settingsPage')}</h1>

      {/* Profile Card */}
      <div className="loom-card">
        <div className="flex items-center space-x-4 mb-4">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold',
            user?.color_preference === 'user' ? 'bg-[hsl(var(--loom-user))]' : 'bg-[hsl(var(--loom-partner))]'
          )}>
            {(displayNameInput || user?.display_name || '').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">{displayNameInput || user?.display_name}</h2>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">{user?.email}</p>
          </div>
          <Info className="w-5 h-5 text-[hsl(var(--loom-text))]" />
        </div>

        <div className="space-y-3">
          <FormField label={t('displayNameLabel')} htmlFor="display_name">
            <TextInput
              id="display_name"
              name="display_name"
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              disabled={isUpdating}
            />
          </FormField>

          <div>
            <label className="block text-sm font-medium mb-2">{t('colorPreferenceLabel')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateProfile('color_preference', 'user')}
                disabled={isUpdating}
                className={cn(
                  'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed',
                  user?.color_preference === 'user'
                    ? 'border-[hsl(var(--loom-user))] bg-[hsl(var(--loom-user)/0.1)]'
                    : 'border-[hsl(var(--loom-border))]'
                )}
              >
                <div className="w-4 h-4 rounded-full bg-[hsl(var(--loom-user))]" />
                <span className="text-sm">{t('tealColor')}</span>
              </button>
              <button
                onClick={() => handleUpdateProfile('color_preference', 'partner')}
                disabled={isUpdating}
                className={cn(
                  'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed',
                  user?.color_preference === 'partner'
                    ? 'border-[hsl(var(--loom-partner))] bg-[hsl(var(--loom-partner)/0.1)]'
                    : 'border-[hsl(var(--loom-border))]'
                )}
              >
                <div className="w-4 h-4 rounded-full bg-[hsl(var(--loom-partner))]" />
                <span className="text-sm">{t('orangeColor')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Partner */}
      <div className="loom-card">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <h2 className="font-medium">{t('partnerConnection')}</h2>
        </div>

        {isLoadingPartner ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(var(--loom-primary))] mx-auto"></div>
            <p className="text-sm text-[hsl(var(--loom-text-muted))] mt-2">{t('loadingPartnerInfo')}</p>
          </div>
        ) : partnerData?.data ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-[hsl(var(--loom-surface))] rounded-[var(--loom-radius-md)]">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold',
                partnerData.data.color_preference === 'user' ? 'bg-[hsl(var(--loom-user))]' : 'bg-[hsl(var(--loom-partner))]'
              )}>
                {partnerData.data.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{partnerData.data.display_name}</h3>
                <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                  {t('connectedStatus')} {partnerData.data.connected_at ? new Date(partnerData.data.connected_at).toLocaleDateString() : t('recently')}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnectPartner}
              disabled={disconnectMutation.isPending}
              className="w-full loom-btn-danger flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserX className="w-4 h-4" />
              <span>{disconnectMutation.isPending ? t('disconnecting') : t('disconnectPartner')}</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <Users className="w-12 h-12 text-[hsl(var(--loom-text-muted))] mx-auto mb-3" />
            <p className="text-[hsl(var(--loom-text-muted))]">{t('noPartnersConnected')}</p>
            <p className="text-sm text-[hsl(var(--loom-text-muted))] mt-1">
              {t('connectWithSomeoneToShareSchedule')}
           </p>
         </div>
       )}
     </div>

      {/* Language */}
      <div className="loom-card">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <h2 className="font-medium">{t('languageSection')}</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {languageOptions.map(({ value, label, flag }) => (
            <button
              key={value}
              onClick={() => setLanguage(value as 'en' | 'zh')}
              className={cn(
                'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2',
                language === value
                  ? 'border-[hsl(var(--loom-primary))] bg-[hsl(var(--loom-primary)/0.1)]'
                  : 'border-[hsl(var(--loom-border))]'
              )}
            >
              <span className="text-lg">{flag}</span>
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="loom-card">
        <div className="flex items-center space-x-3 mb-4">
          <Monitor className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <h2 className="font-medium">{t('themeSection')}</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value as 'light' | 'dark')}
              className={cn(
                'p-3 rounded-[var(--loom-radius-md)] border transition-all flex flex-col items-center space-y-1',
                theme === value
                  ? 'border-[hsl(var(--loom-primary))] bg-[hsl(var(--loom-primary)/0.1)]'
                  : 'border-[hsl(var(--loom-border))]'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Logout Button */}
      <div className="pt-4">
        <button
          onClick={handleLogout}
          className="w-full loom-btn-danger flex items-center justify-center space-x-2"
        >
          <LogOut className="w-4 h-4 text-white" />
          <span>{t('logOut')}</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;