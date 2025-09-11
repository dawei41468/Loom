import * as React from 'react';
import {
  Select as UiSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type Option = { value: string; label: string };

type SelectProps = {
  id?: string;
  name?: string;
  value?: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export const Select: React.FC<SelectProps> = ({
  id,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
  className,
}) => {
  return (
    <UiSelect value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} name={name} className={className} aria-required={required}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </UiSelect>
  );
};
