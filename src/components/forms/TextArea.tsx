import React from 'react';

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = '', error = false, rows = 3, ...props }, ref) => {
    const base =
      'w-full px-4 py-3 rounded-[var(--loom-radius-md)] border bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent resize-none';
    const border = error ? 'border-red-500' : 'border-[hsl(var(--loom-border))]';

    return (
      <textarea ref={ref} rows={rows} className={[base, border, className].join(' ')} {...props} />
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;
