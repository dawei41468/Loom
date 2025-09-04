// Settings Page
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Globe,
  Moon,
  Sun,
  Monitor,
  Users,
  QrCode,
  Info,
  ChevronRight,
  Copy,
  Check,
  LogOut,
  Clock
} from 'lucide-react';
import { useAuthState, useAuthDispatch, useUpdateProfile } from '../contexts/AuthContext';
import { useTheme, useLanguage, useUIActions } from '../contexts/UIContext';
import { useToastContext } from '../contexts/ToastContext';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18n';

const Settings = () => {
  const navigate = useNavigate();
  const { user, partner } = useAuthState();
  const authDispatch = useAuthDispatch();
  const { updateProfile, isUpdating, error } = useUpdateProfile();
  const theme = useTheme();
  const language = useLanguage();
  const { setTheme, setLanguage } = useUIActions();
  const { addToast } = useToastContext();
  const { t } = useTranslation();
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(user?.display_name || '');

  // Debounced display name update
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (displayNameInput !== user?.display_name && displayNameInput.trim() !== '' && !isUpdating) {
        try {
          await updateProfile({ display_name: displayNameInput });
          addToast({
            type: 'success',
            title: 'Profile updated',
            description: 'Display name has been saved.',
          });
        } catch (error) {
          addToast({
            type: 'error',
            title: 'Update failed',
            description: 'Failed to update display name. Please try again.',
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
  }, [user?.display_name]);

  const handleCopyInvite = async () => {
    const inviteLink = 'https://loom.app/join/abc123';
    
    try {
      await navigator.clipboard.writeText(inviteLink);
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

  const handleLogout = () => {
    authDispatch({ type: 'LOGOUT' });
    addToast({
      type: 'info',
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
  };

  const handleUpdateProfile = async (field: string, value: string) => {
    if (user && !isUpdating) {
      try {
        await updateProfile({ [field]: value });
        addToast({
          type: 'success',
          title: 'Profile updated',
          description: `${field === 'color_preference' ? 'Color preference' : 'Profile'} has been saved.`,
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Update failed',
          description: 'Failed to update profile. Please try again.',
        });
      }
    }
  };

  const themeOptions = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Monitor },
  ];

  const languageOptions = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'zh', label: '中文', flag: '🇨🇳' },
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
          <ChevronRight className="w-5 h-5 text-[hsl(var(--loom-text))]" />
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">{t('displayNameLabel')}</label>
            <input
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              disabled={isUpdating}
              className="w-full px-3 py-2 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

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

      {/* Partner Connection */}
      <div className="loom-card">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <h2 className="font-medium">{t('partnerConnectionSection')}</h2>
        </div>
        
        {partner ? (
          <div className="flex items-center space-x-3 p-3 rounded-[var(--loom-radius-md)] bg-[hsl(var(--loom-shared)/0.1)] border border-[hsl(var(--loom-shared)/0.2)]">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--loom-partner))] flex items-center justify-center text-white font-semibold">
              {partner.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{partner.display_name}</h3>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">{t('connectedStatus')}</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--loom-success))]" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[hsl(var(--loom-text-muted))] text-sm">
              {t('shareInviteLink')}
            </p>
            
            <div className="flex items-center space-x-2 p-3 rounded-[var(--loom-radius-md)] bg-[hsl(var(--loom-surface))] border">
              <code className="flex-1 text-sm font-mono">
                https://loom.app/join/abc123
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
            
            <button className="w-full loom-btn-ghost flex items-center justify-center space-x-2">
              <QrCode className="w-4 h-4" />
              <span>{t('showQrCode')}</span>
            </button>
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
        
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
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

      {/* About */}
      <div className="loom-card">
        <div className="flex items-center space-x-3 mb-4">
          <Info className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <h2 className="font-medium">{t('aboutSection')}</h2>
        </div>

        <div className="space-y-2 text-sm text-[hsl(var(--loom-text-muted))]">
          <div className="flex justify-between">
            <span>{t('versionLabel')}</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>{t('buildLabel')}</span>
            <span>2024.01.01</span>
          </div>
          <div className="pt-2 border-t border-[hsl(var(--loom-border))]">
            <p className="italic text-center">
              {t('tagline')}
            </p>
          </div>
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