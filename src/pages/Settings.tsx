// Settings Page
import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Globe,
  Moon,
  Sun,
  Monitor,
  Info,
  LogOut,
  Users,
  UserX,
  ChevronDown
} from 'lucide-react';
import { useAuthState, useAuthDispatch } from '../contexts/AuthContext';
import { useTheme, useLanguage, useUIActions } from '../contexts/UIContext';
import { useToastContext } from '../contexts/ToastContext';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18n';
import FormField from '../components/forms/FormField';
import TextInput from '../components/forms/TextInput';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerQueries, userQueries, queryKeys } from '../api/queries';
import { apiClient } from '../api/client';
import { Partner } from '../types';
const Settings = () => {
  const { user } = useAuthState();
  const authDispatch = useAuthDispatch();
  const theme = useTheme();
  const language = useLanguage();
  const { setTheme, setLanguage } = useUIActions();
  const { addToast } = useToastContext();
  const { t } = useTranslation();
  // Load current user profile via React Query
  const { data: meData } = useQuery({
    queryKey: queryKeys.user,
    queryFn: userQueries.getMe,
    refetchOnWindowFocus: false,
  });
  const meUser = meData?.data || user;

  const [displayNameInput, setDisplayNameInput] = useState(meUser?.display_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const selfColorPickerRef = useRef<HTMLInputElement>(null);
  const partnerColorPickerRef = useRef<HTMLInputElement>(null);

  // Partner queries
  const { data: partnerData, isLoading: isLoadingPartner } = useQuery({
    queryKey: ['partner'],
    queryFn: partnerQueries.getPartner,
    refetchOnWindowFocus: false,
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (payload: { current_password: string }) => apiClient.deleteAccount(payload),
    onSuccess: () => {
      setDeletePassword('');
      authDispatch({ type: 'LOGOUT' });
      addToast({
        type: 'success',
        title: t('accountDeleted'),
        description: t('accountDeletedDesc'),
      });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: t('error'),
        description: error?.message || t('deletionFailed'),
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (payload: { current_password: string; new_password: string }) => {
      return apiClient.changePassword(payload);
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Force logout so user must sign in again with new password
      authDispatch({ type: 'LOGOUT' });
      addToast({
        type: 'success',
        title: t('passwordUpdated'),
        description: t('pleaseSignInAgainWithNewPassword'),
      });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: t('error'),
        description: error?.message || t('failedToUpdatePassword'),
      });
    },
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

  // Sync local input when meUser changes
  useEffect(() => {
    if (typeof meUser?.display_name === 'string') {
      setDisplayNameInput(meUser.display_name);
    }
  }, [meUser?.display_name]);

  // Update profile via React Query mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<Partner>) => apiClient.updateMe(updates),
  });

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
    try {
      await updateProfileMutation.mutateAsync({ [field]: value } as Partial<Partner>);
      // Invalidate and refetch user profile
      await queryClient.invalidateQueries({ queryKey: queryKeys.user });
      addToast({
        type: 'success',
        title: t('profileUpdated'),
        description:
          field === 'color_preference'
            ? t('colorPreferenceSaved')
            : field === 'display_name'
            ? t('displayNameSaved')
            : t('profileSaved'),
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: t('error'),
        description: t('failedToUpdateProfile'),
      });
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

  // Resolve a color token ('user' | 'partner' | '#RRGGBB') to CSS color string
  const resolveColor = (token?: string): string => {
    if (!token) return 'hsl(var(--loom-user))';
    if (token === 'user') return 'hsl(var(--loom-user))';
    if (token === 'partner') return 'hsl(var(--loom-partner))';
    return token; // assume valid hex
  };

  return (
    <div className="container py-6 space-y-3">
      {/* Header */}
      <h1 className="text-2xl font-semibold">{t('settingsPage')}</h1>

      {/* Profile Card */}
      <div className="loom-card">
        <div className="flex items-center space-x-4 mb-4">
          <div
            className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold')}
            style={{ backgroundColor: resolveColor(meUser?.ui_self_color || 'user') }}
          >
            {(displayNameInput || meUser?.display_name || '').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">{displayNameInput || meUser?.display_name}</h2>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">{meUser?.email}</p>
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
              autoComplete="name"
            />
          </FormField>
          <div>
            <button
              onClick={() => handleUpdateProfile('display_name', displayNameInput.trim())}
              disabled={updateProfileMutation.isPending ||
                displayNameInput.trim() === '' ||
                displayNameInput.trim() === (meUser?.display_name || '').trim()
              }
              className="w-full sm:w-auto loom-btn-primary disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {t('updateName')}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('myColor')}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleUpdateProfile('ui_self_color', 'user')}
                disabled={updateProfileMutation.isPending}
                className={cn(
                  'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed',
                  (meUser?.ui_self_color || 'user') === 'user'
                    ? 'border-[hsl(var(--loom-user))] bg-[hsl(var(--loom-user)/0.1)]'
                    : 'border-[hsl(var(--loom-border))]'
                )}
              >
                <div className="w-3 h-3 rounded-full bg-[hsl(var(--loom-user))]" />
                <span className="text-xs">{t('tealColor')}</span>
              </button>
              <button
                onClick={() => handleUpdateProfile('ui_self_color', 'partner')}
                disabled={updateProfileMutation.isPending}
                className={cn(
                  'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed',
                  (meUser?.ui_self_color || 'user') === 'partner'
                    ? 'border-[hsl(var(--loom-partner))] bg-[hsl(var(--loom-partner)/0.1)]'
                    : 'border-[hsl(var(--loom-border))]'
                )}
              >
                <div className="w-3 h-3 rounded-full bg-[hsl(var(--loom-partner))]" />
                <span className="text-xs">{t('orangeColor')}</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => selfColorPickerRef.current?.click()}
                  disabled={updateProfileMutation.isPending}
                  className={cn(
                    'w-full p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2 justify-start disabled:opacity-50 disabled:cursor-not-allowed',
                    (meUser?.ui_self_color || '')?.startsWith('#') ? 'border-[hsl(var(--loom-primary))] bg-[hsl(var(--loom-primary)/0.06)]' : 'border-[hsl(var(--loom-border))]'
                  )}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: resolveColor(meUser?.ui_self_color || '#14b8a6') }} />
                  <span className="text-xs">{t('customColor')}</span>
                </button>
                <input
                  ref={selfColorPickerRef}
                  type="color"
                  className="absolute opacity-0 pointer-events-none"
                  value={(meUser?.ui_self_color || '').startsWith('#') ? meUser!.ui_self_color! : '#14b8a6'}
                  onChange={(e) => handleUpdateProfile('ui_self_color', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">{t('partnerColor')}</label>
            {!partnerData?.data && (
              <p className="text-xs text-[hsl(var(--loom-text-muted))] mb-2">{t('partnerColorHintNoPartner')}</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleUpdateProfile('ui_partner_color', 'user')}
                disabled={updateProfileMutation.isPending}
                className={cn(
                  'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed',
                  (meUser?.ui_partner_color || 'partner') === 'user'
                    ? 'border-[hsl(var(--loom-user))] bg-[hsl(var(--loom-user)/0.1)]'
                    : 'border-[hsl(var(--loom-border))]'
                )}
              >
                <div className="w-3 h-3 rounded-full bg-[hsl(var(--loom-user))]" />
                <span className="text-xs">{t('tealColor')}</span>
              </button>
              <button
                onClick={() => handleUpdateProfile('ui_partner_color', 'partner')}
                disabled={updateProfileMutation.isPending}
                className={cn(
                  'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed',
                  (meUser?.ui_partner_color || 'partner') === 'partner'
                    ? 'border-[hsl(var(--loom-partner))] bg-[hsl(var(--loom-partner)/0.1)]'
                    : 'border-[hsl(var(--loom-border))]'
                )}
              >
                <div className="w-3 h-3 rounded-full bg-[hsl(var(--loom-partner))]" />
                <span className="text-xs">{t('orangeColor')}</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => partnerColorPickerRef.current?.click()}
                  disabled={updateProfileMutation.isPending}
                  className={cn(
                    'w-full p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2 justify-start disabled:opacity-50 disabled:cursor-not-allowed',
                    (meUser?.ui_partner_color || '')?.startsWith('#') ? 'border-[hsl(var(--loom-primary))] bg-[hsl(var(--loom-primary)/0.06)]' : 'border-[hsl(var(--loom-border))]'
                  )}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: resolveColor(meUser?.ui_partner_color || '#f97316') }} />
                  <span className="text-xs">{t('customColor')}</span>
                </button>
                <input
                  ref={partnerColorPickerRef}
                  type="color"
                  className="absolute opacity-0 pointer-events-none"
                  value={(meUser?.ui_partner_color || '').startsWith('#') ? meUser!.ui_partner_color! : '#f97316'}
                  onChange={(e) => handleUpdateProfile('ui_partner_color', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[hsl(var(--loom-border))] pt-4">
            <button
              type="button"
              onClick={() => setIsPasswordOpen((v) => !v)}
              aria-expanded={isPasswordOpen}
              aria-controls="profile-change-password"
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-sm font-medium">{t('changePassword')}</h3>
              <ChevronDown className={cn('w-4 h-4 transition-transform', isPasswordOpen ? 'rotate-180' : '')} />
            </button>
            {isPasswordOpen && (
              <form
                id="profile-change-password"
                className="space-y-3 mt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newPassword !== confirmPassword) {
                    addToast({
                      type: 'error',
                      title: t('passwordsDoNotMatch'),
                      description: t('pleaseEnsurePasswordsMatch'),
                    });
                    return;
                  }
                  if (!currentPassword || !newPassword) {
                    addToast({
                      type: 'error',
                      title: t('missingFields'),
                      description: t('enterCurrentAndNewPassword'),
                    });
                    return;
                  }
                  changePasswordMutation.mutate({ current_password: currentPassword, new_password: newPassword });
                }}
              >
                {/* Hidden username field for accessibility and browser password managers */}
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={user?.email || ''}
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />
                <FormField label={t('currentPassword')} htmlFor="current_password">
                  <TextInput
                    id="current_password"
                    name="current_password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={changePasswordMutation.isPending}
                  />
                </FormField>
                <FormField label={t('newPassword')} htmlFor="new_password">
                  <TextInput
                    id="new_password"
                    name="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={changePasswordMutation.isPending}
                  />
                </FormField>
                <FormField label={t('confirmNewPassword')} htmlFor="confirm_password">
                  <TextInput
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={changePasswordMutation.isPending}
                  />
                </FormField>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="w-full loom-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changePasswordMutation.isPending ? t('updating') : t('updatePassword')}
                </button>
              </form>
            )}
          </div>

          <div className="border-t border-[hsl(var(--loom-border))] pt-4">
            <button
              type="button"
              onClick={() => setIsDeleteOpen((v) => !v)}
              aria-expanded={isDeleteOpen}
              aria-controls="profile-delete-account"
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-sm font-medium">{t('deleteAccount')}</h3>
              <ChevronDown className={cn('w-4 h-4 transition-transform', isDeleteOpen ? 'rotate-180' : '')} />
            </button>
            {isDeleteOpen && (
              <form
                id="profile-delete-account"
                className="space-y-3 mt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!deletePassword) {
                    addToast({ type: 'error', title: t('error'), description: t('enterPasswordToConfirm') });
                    return;
                  }
                  if (window.confirm(t('confirmDeleteAccount'))) {
                    deleteAccountMutation.mutate({ current_password: deletePassword });
                  }
                }}
              >
                <p className="text-sm text-[hsl(var(--loom-text-muted))]">{t('deleteAccountDesc')}</p>
                {/* Hidden username for password manager context */}
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={user?.email || ''}
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />
                <FormField label={t('enterPasswordToConfirm')} htmlFor="delete_password">
                  <TextInput
                    id="delete_password"
                    name="delete_password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={deleteAccountMutation.isPending}
                  />
                </FormField>
                <button
                  type="submit"
                  disabled={deleteAccountMutation.isPending}
                  className="w-full loom-btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteAccountMutation.isPending ? t('deleting') : t('deleteAccount')}
                </button>
              </form>
            )}
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
              <div
                className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold')}
                style={{ backgroundColor: resolveColor(user?.ui_partner_color || 'partner') }}
              >
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
            <NavLink
              to="/partner"
              className="mt-3 inline-block text-[hsl(var(--loom-primary))] hover:underline"
            >
              Connect Now
            </NavLink>
         </div>
       )}
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
                'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2',
                theme === value
                  ? 'border-[hsl(var(--loom-primary))] bg-[hsl(var(--loom-primary)/0.1)]'
                  : 'border-[hsl(var(--loom-border))]'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
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
                'p-3 h-12 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2',
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


      {/* Logout Button */}
      <div className="pt-8">
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