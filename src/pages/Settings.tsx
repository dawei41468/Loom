// Settings Page
import React, { useState } from 'react';
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
import { useAuthState, useAuthDispatch } from '../contexts/AuthContext';
import { useTheme, useLanguage, useUIActions } from '../contexts/UIContext';
import { useToastContext } from '../contexts/ToastContext';
import { cn } from '@/lib/utils';

const Settings = () => {
  const navigate = useNavigate();
  const { user, partner } = useAuthState();
  const authDispatch = useAuthDispatch();
  const theme = useTheme();
  const language = useLanguage();
  const { setTheme, setLanguage } = useUIActions();
  const { addToast } = useToastContext();
  const [copiedInvite, setCopiedInvite] = useState(false);

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

  const handleUpdateProfile = (field: string, value: string) => {
    if (user) {
      authDispatch({
        type: 'SET_USER',
        payload: {
          ...user,
          [field]: value,
          updated_at: new Date().toISOString(),
        },
      });
      
      addToast({
        type: 'success',
        title: 'Profile updated',
      });
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const languageOptions = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile Card */}
      <div className="loom-card">
        <div className="flex items-center space-x-4 mb-4">
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold',
            user?.color_preference === 'user' ? 'bg-[hsl(var(--loom-user))]' : 'bg-[hsl(var(--loom-partner))]'
          )}>
            {user?.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">{user?.display_name}</h2>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">{user?.email}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[hsl(var(--loom-text))]" />
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={user?.display_name || ''}
              onChange={(e) => handleUpdateProfile('display_name', e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--loom-radius-md)] border border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Color Preference</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateProfile('color_preference', 'user')}
                className={cn(
                  'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2',
                  user?.color_preference === 'user'
                    ? 'border-[hsl(var(--loom-user))] bg-[hsl(var(--loom-user)/0.1)]'
                    : 'border-[hsl(var(--loom-border))]'
                )}
              >
                <div className="w-4 h-4 rounded-full bg-[hsl(var(--loom-user))]" />
                <span className="text-sm">Teal</span>
              </button>
              <button
                onClick={() => handleUpdateProfile('color_preference', 'partner')}
                className={cn(
                  'p-3 rounded-[var(--loom-radius-md)] border transition-all flex items-center space-x-2',
                  user?.color_preference === 'partner'
                    ? 'border-[hsl(var(--loom-partner))] bg-[hsl(var(--loom-partner)/0.1)]'
                    : 'border-[hsl(var(--loom-border))]'
                )}
              >
                <div className="w-4 h-4 rounded-full bg-[hsl(var(--loom-partner))]" />
                <span className="text-sm">Orange</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Connection */}
      <div className="loom-card">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <h2 className="font-medium">Partner Connection</h2>
        </div>
        
        {partner ? (
          <div className="flex items-center space-x-3 p-3 rounded-[var(--loom-radius-md)] bg-[hsl(var(--loom-shared)/0.1)] border border-[hsl(var(--loom-shared)/0.2)]">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--loom-partner))] flex items-center justify-center text-white font-semibold">
              {partner.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{partner.display_name}</h3>
              <p className="text-sm text-[hsl(var(--loom-text-muted))]">Connected</p>
            </div>
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--loom-success))]" />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[hsl(var(--loom-text-muted))] text-sm">
              Share your invite link to connect with your partner
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
              <span>Show QR Code</span>
            </button>
          </div>
        )}
      </div>

      {/* Language */}
      <div className="loom-card">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="w-5 h-5 text-[hsl(var(--loom-primary))]" />
          <h2 className="font-medium">Language</h2>
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
          <h2 className="font-medium">Theme</h2>
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
          <h2 className="font-medium">About</h2>
        </div>
        
        <div className="space-y-2 text-sm text-[hsl(var(--loom-text-muted))]">
          <div className="flex justify-between">
            <span>Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Build</span>
            <span>2024.01.01</span>
          </div>
          <div className="pt-2 border-t border-[hsl(var(--loom-border))]">
            <button
              onClick={() => navigate('/timepicker-demo')}
              className="w-full flex items-center justify-between p-3 rounded-[var(--loom-radius-md)] hover:bg-[hsl(var(--loom-border))] transition-colors mb-2"
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[hsl(var(--loom-primary))]" />
                <span className="text-sm">TimePicker Demo</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[hsl(var(--loom-text))]" />
            </button>
            <p className="italic text-center">
              "weave your days together"
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
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;