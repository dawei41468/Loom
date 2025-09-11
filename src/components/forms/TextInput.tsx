import React from 'react';

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  variant?: 'default' | 'bare';
};

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', error = false, variant = 'default', type = 'text', ...props }, ref) => {
    const baseDefault =
      'w-full px-4 py-3 rounded-[var(--loom-radius-md)] border bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent';
    const borderDefault = error
      ? 'border-red-500'
      : 'border-[hsl(var(--loom-border))]';

    const baseBare = 'bg-transparent border-none outline-none';

    const classes =
      variant === 'bare'
        ? [baseBare, className]
        : [baseDefault, borderDefault, className];

    return <input ref={ref} type={type} className={classes.join(' ')} {...props} />;
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
