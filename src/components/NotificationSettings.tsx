import React from 'react';
import { usePushNotifications } from '@/contexts/PushNotificationContext';
import { useTranslation } from '@/i18n';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const NOTIFICATION_TOPICS = [
  { id: 'proposals', labelKey: 'proposals', descriptionKey: 'proposalsDesc' },
  { id: 'chat', labelKey: 'chatMessages', descriptionKey: 'chatMessagesDesc' },
  { id: 'checklists', labelKey: 'checklists', descriptionKey: 'checklistsDesc' },
  { id: 'invites', labelKey: 'eventInvites', descriptionKey: 'eventInvitesDesc' },
  { id: 'reminders', labelKey: 'notificationReminders', descriptionKey: 'remindersDesc' },
  { id: 'system', labelKey: 'systemUpdates', descriptionKey: 'systemUpdatesDesc' }
];

export function NotificationSettings() {
  const { 
    permission, 
    enabledTopics, 
    isLoading,
    enableNotifications,
    disableNotifications,
    toggleTopic
  } = usePushNotifications();
  const { t } = useTranslation();

  const handleEnableNotifications = async () => {
    await enableNotifications();
  };

  const handleDisableNotifications = async () => {
    await disableNotifications();
  };

  const handleTopicToggle = async (topicId: string, enabled: boolean) => {
    await toggleTopic(topicId, enabled);
  };

  return (
    <Card className="border-[hsl(var(--loom-border))] bg-[hsl(var(--loom-surface))]">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--loom-text))]">{t('pushNotifications')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-[hsl(var(--loom-text))]">{t('enablePushNotifications')}</h3>
            <p className="text-sm text-[hsl(var(--loom-text-muted))]">
              {t('receiveTimelyNotifications')}
            </p>
          </div>
          {permission === 'granted' ? (
            <Button
              onClick={handleDisableNotifications}
              variant="destructive"
              disabled={isLoading}
            >
              {isLoading ? t('disabling') : t('disable')}
            </Button>
          ) : (
            <Button
              onClick={handleEnableNotifications}
              disabled={permission === 'denied' || isLoading}
              className="bg-[hsl(var(--loom-primary))] hover:bg-[hsl(var(--loom-primary)/0.9)]"
            >
              {isLoading ? t('enabling') : (permission === 'denied' ? t('blocked') : t('enable'))}
            </Button>
          )}
        </div>

        {permission === 'granted' && (
          <div className="space-y-4">
            <h4 className="font-medium text-[hsl(var(--loom-text))]">{t('notificationTypes')}</h4>
            {NOTIFICATION_TOPICS.map((topic) => (
              <div key={topic.id} className="flex items-center justify-between py-2">
                <div>
                  <Label className="font-medium text-[hsl(var(--loom-text))]">
                    {t(topic.labelKey)}
                  </Label>
                  <p className="text-sm text-[hsl(var(--loom-text-muted))]">
                    {t(topic.descriptionKey)}
                  </p>
                </div>
                <Checkbox
                  checked={enabledTopics.includes(topic.id)}
                  onCheckedChange={(checked) => handleTopicToggle(topic.id, Boolean(checked))}
                  className="data-[state=checked]:bg-[hsl(var(--loom-primary))] data-[state=checked]:border-[hsl(var(--loom-primary))]"
                />
              </div>
            ))}
          </div>
        )}

        {permission === 'denied' && (
          <Alert variant="destructive" className="border-[hsl(var(--loom-destructive-border))]">
            <AlertDescription className="text-[hsl(var(--loom-destructive-text))]">
              {t('notificationsBlocked')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}