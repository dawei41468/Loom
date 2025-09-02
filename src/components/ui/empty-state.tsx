import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className
}) => {
  return (
    <div className={cn("text-center py-12", className)}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--loom-border))] flex items-center justify-center">
        <Icon className="w-8 h-8 text-[hsl(var(--loom-text-muted))]" />
      </div>
      <h3 className="loom-heading-3 mb-2">{title}</h3>
      {description && (
        <p className="loom-text-muted mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
};