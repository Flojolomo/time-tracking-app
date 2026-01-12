import React from 'react';

interface AlertProps {
  type: 'error' | 'success';
  message: string;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  message,
  className = ''
}) => {
  const typeClasses = {
    error: 'bg-red-50 border-red-200 text-red-600',
    success: 'bg-green-50 border-green-200 text-green-600'
  };

  return (
    <div className={`mb-4 p-3 border rounded-md ${typeClasses[type]} ${className}`}>
      <p className="text-sm">{message}</p>
    </div>
  );
};