import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from '@/i18n';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  ua?: string;
  platform?: 'web' | 'ios_pwa' | 'android_pwa' | 'desktop';
  topics: string[];
  active: boolean;
}

interface PushNotificationContextType {
  permission: NotificationPermission;
  enabledTopics: string[];
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
  toggleTopic: (topicId: string, enabled: boolean) => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  
  // Get current subscription
  const { data: subscription, isLoading } = useQuery<PushSubscription>({
    queryKey: ['push-subscription'],
    queryFn: async () => {
      const response = await apiClient.getPushSubscription();
      return response.data;
    },
    enabled: permission === 'granted',
  });
  
  const enabledTopics = subscription?.topics || ['proposals', 'reminders'];

 // Check current notification permission status
  useEffect(() => {
    setPermission(Notification.permission);
  }, []);

  // Mutations
 const subscribeMutation = useMutation({
    mutationFn: async (topics: string[]) => {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
      });

      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth'))
        },
        ua: navigator.userAgent,
        platform: 'web' as const,
        topics
      };

      return apiClient.createPushSubscription(subscriptionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast({
        title: t('notificationsEnabled'),
        description: t('notificationsEnabledDesc')
      });
    },
    onError: (error) => {
      toast({
        title: t('notificationError'),
        description: t('failedToEnableNotifications'),
        variant: 'destructive'
      });
    }
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        await apiClient.deletePushSubscription(pushSubscription.endpoint);
        
        await pushSubscription.unsubscribe();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast({
        title: t('notificationsDisabled'),
        description: t('notificationsDisabledDesc')
      });
    },
    onError: (error) => {
      toast({
        title: t('notificationError'),
        description: t('failedToDisableNotifications'),
        variant: 'destructive'
      });
    }
  });

  const updateTopicsMutation = useMutation({
    mutationFn: async (topics: string[]) => {
      return apiClient.updatePushSubscriptionTopics(topics);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      toast({
        title: t('preferencesUpdated'),
        description: t('notificationPreferencesUpdated')
      });
    },
    onError: (error) => {
      toast({
        title: t('notificationError'),
        description: t('failedToUpdatePreferences'),
        variant: 'destructive'
      });
    }
  });

  const requestPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast({
        title: t('notSupported'),
        description: t('pushNotificationsNotSupported'),
        variant: 'destructive'
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission !== 'granted') {
        toast({
          title: t('permissionDenied'),
          description: t('enableNotificationsInBrowser'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: t('notificationError'),
        description: t('failedToRequestPermission'),
        variant: 'destructive'
      });
    }
  };

 const enableNotifications = async () => {
    if (permission !== 'granted') {
      await requestPermission();
    }
    
    if (Notification.permission === 'granted') {
      subscribeMutation.mutate(enabledTopics);
    }
  };

  const disableNotifications = async () => {
    unsubscribeMutation.mutate();
  };

  const toggleTopic = async (topicId: string, enabled: boolean) => {
    let newTopics: string[];
    if (enabled) {
      newTopics = [...enabledTopics, topicId];
    } else {
      newTopics = enabledTopics.filter(id => id !== topicId);
    }
    
    updateTopicsMutation.mutate(newTopics);
  };

  const value = {
    permission,
    enabledTopics,
    isLoading,
    requestPermission,
    enableNotifications,
    disableNotifications,
    toggleTopic
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}