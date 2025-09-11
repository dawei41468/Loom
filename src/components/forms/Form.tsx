import React from 'react';

type FormProps = React.FormHTMLAttributes<HTMLFormElement> & {
  children: React.ReactNode;
};

const Form: React.FC<FormProps> = ({ children, className = '', ...props }) => {
  return (
    <form {...props} className={["space-y-6", className].filter(Boolean).join(' ')}>
      {children}
    </form>
  );
};

export default Form;
