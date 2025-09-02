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
        <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6">
          <div className="flex-1 min-w-0">
            {title && <h2 className="loom-heading-3 line-clamp-1">{title}</h2>}
            {description && (
              <p className="loom-text-muted mt-1 text-sm sm:text-base line-clamp-2">{description}</p>
            )}
          </div>
          {action && (
            <div className="ml-2 sm:ml-4 flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};