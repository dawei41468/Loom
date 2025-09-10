import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { cn } from '@/lib/utils';
import { useTranslation } from '../i18n';

const OfflineIndicator: React.FC = () => {
  const { isOnline, pendingActionsCount, syncNow } = useOfflineQueue();
  const { t } = useTranslation();

  if (isOnline && pendingActionsCount === 0) {
    return null; // Don't show anything when online and no pending actions
  }

  return (
    <div className={cn(
      'fixed right-4 z-30 flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg transition-all duration-300 top-[calc(env(safe-area-inset-top)+3.5rem+0.5rem)]',
      isOnline
        ? 'bg-[hsl(var(--loom-success))]/10 border border-[hsl(var(--loom-success))]/20 text-[hsl(var(--loom-success))]'
        : 'bg-[hsl(var(--loom-warning))]/10 border border-[hsl(var(--loom-warning))]/20 text-[hsl(var(--loom-warning))]'
    )}>
      {/* Connection Status Icon */}
      <div className="flex items-center space-x-1">
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isOnline ? t('online') : t('offline')}
        </span>
      </div>

      {/* Pending Actions Indicator */}
      {pendingActionsCount > 0 && (
        <>
          <div className="w-px h-4 bg-current opacity-30" />
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">
              {pendingActionsCount} {t('pending')}
            </span>
          </div>
        </>
      )}

      {/* Sync Button (only show when online and have pending actions) */}
      {isOnline && pendingActionsCount > 0 && (
        <>
          <div className="w-px h-4 bg-current opacity-30" />
          <button
            onClick={syncNow}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs bg-current text-white hover:bg-current/90 transition-colors"
            title="Sync pending actions"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t('sync')}</span>
          </button>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;