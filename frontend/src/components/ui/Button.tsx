import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variantClasses = {
    primary: 'text-white bg-indigo-600 border border-transparent hover:bg-indigo-700 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
    danger: 'text-white bg-red-600 border border-transparent hover:bg-red-700 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (loadingText || children) : children}
    </button>
  );
};