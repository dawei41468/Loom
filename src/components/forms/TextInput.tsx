import React from 'react';

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = '', error = false, type = 'text', ...props }, ref) => {
    const base =
      'w-full px-4 py-3 rounded-[var(--loom-radius-md)] border bg-[hsl(var(--loom-surface))] text-[hsl(var(--loom-text))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--loom-primary))] focus:border-transparent';
    const border = error
      ? 'border-red-500'
      : 'border-[hsl(var(--loom-border))]';

    return (
      <input ref={ref} type={type} className={[base, border, className].join(' ')} {...props} />
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
