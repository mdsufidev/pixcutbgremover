import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none select-none active:scale-[0.98] disabled:active:scale-100 disabled:pointer-events-none disabled:opacity-50';

  const variantStyles = {
    primary:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs border border-emerald-600',
    secondary:
      'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 shadow-xs hover:border-gray-300',
    ghost:
      'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900',
    outline:
      'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-xs hover:border-gray-400',
    danger:
      'bg-red-600 hover:bg-red-500 text-white shadow-xs border border-red-600',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
    icon: 'p-2 text-sm',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : icon}
      {children}
    </button>
  );
};
