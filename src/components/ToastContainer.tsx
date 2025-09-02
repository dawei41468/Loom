// Toast Container Component
import { useUI } from '../store';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContainer = () => {
  const { toasts, removeToast } = useUI();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'loom-card min-w-[300px] max-w-md slide-up',
            toast.type === 'success' && 'border-[hsl(var(--loom-success))]',
            toast.type === 'error' && 'border-[hsl(var(--loom-danger))]',
            toast.type === 'warning' && 'border-[hsl(var(--loom-warning))]'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{toast.title}</h4>
              {toast.description && (
                <p className="text-xs text-[hsl(var(--loom-text-muted))] mt-1">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-1 hover:bg-[hsl(var(--loom-border))] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;