'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type NativePassword = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'>;

export interface PasswordFieldProps extends NativePassword {
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
  wrapperClassName?: string;
}

/** Password input with built-in show/hide toggle — use when styling the raw `<input>` directly. */
export function PasswordField({
  value,
  onChange,
  inputClassName,
  wrapperClassName,
  className,
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn('relative', wrapperClassName)}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClassName, className, 'pr-10')}
        {...rest}
      />
      <PasswordToggleButton visible={visible} onToggle={() => setVisible((v) => !v)} />
    </div>
  );
}

export function PasswordToggleButton({
  visible,
  onToggle,
  size = 16,
  className,
}: {
  visible: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={visible ? 'Hide password' : 'Show password'}
      className={cn(
        'absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEAE] hover:text-gray-600 p-0.5 transition-colors',
        className,
      )}
    >
      {visible ? <EyeOff size={size} /> : <Eye size={size} />}
    </button>
  );
}
