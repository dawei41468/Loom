import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  className
}) => {
  return (
    <div className={cn("space-y-1 sm:space-y-2", className)}>
      <div className="flex items-start sm:items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="loom-heading-2 line-clamp-2">{title}</h1>
          {subtitle && (
            <p className="loom-text-muted mt-1 text-sm sm:text-base line-clamp-1">{subtitle}</p>
          )}
        </div>
        {action && (
          <div className="ml-2 sm:ml-4 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};