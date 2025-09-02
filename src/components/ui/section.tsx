import React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'card' | 'elevated';
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  action,
  children,
  className,
  variant = 'default'
}) => {
  const cardClasses = {
    default: '',
    card: 'loom-card',
    elevated: 'loom-card-elevated'
  };

  return (
    <div className={cn(cardClasses[variant], className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {title && <h2 className="loom-heading-3">{title}</h2>}
            {description && (
              <p className="loom-text-muted mt-1">{description}</p>
            )}
          </div>
          {action && (
            <div className="ml-4">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};