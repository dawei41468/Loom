import React from 'react';

type SubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingText?: string;
};

const SubmitButton: React.FC<SubmitButtonProps> = ({
  isLoading = false,
  loadingText,
  className = '',
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      type="submit"
      disabled={isLoading || disabled}
      className={[
        'loom-btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50',
        className,
      ].join(' ')}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>{loadingText ?? 'Submitting…'}</span>
        </>
      ) : (
        <>{children}</>
      )}
    </button>
  );
};

export default SubmitButton;
