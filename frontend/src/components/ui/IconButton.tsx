import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  size?: 'sm' | 'md';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = 'rounded focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variantClasses = {
    default: 'text-gray-400 hover:text-gray-600 focus:ring-indigo-500',
    danger: 'text-gray-400 hover:text-red-600 focus:ring-red-500'
  };
  
  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2'
  };

  return (
    <button
      {...props}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
    </button>
  );
};