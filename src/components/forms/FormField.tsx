import React from 'react';

export type FormFieldProps = {
  label?: string;
  htmlFor?: string;
  error?: string | null;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  description,
  required,
  className = '',
  children,
}) => {
  const describedByIds: string[] = [];
  if (description) describedByIds.push(`${htmlFor}-desc`);
  if (error) describedByIds.push(`${htmlFor}-err`);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium mb-2 text-[hsl(var(--loom-text))]">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
      )}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            id: htmlFor,
            'aria-invalid': !!error || undefined,
            'aria-describedby': describedByIds.length ? describedByIds.join(' ') : undefined,
          })
        : children}
      {description && (
        <p id={`${htmlFor}-desc`} className="mt-1 text-xs text-[hsl(var(--loom-text-muted))]">
          {description}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-err`} className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
