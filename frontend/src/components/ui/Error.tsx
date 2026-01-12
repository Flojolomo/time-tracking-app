import React from 'react';
import { Alert } from './Alert';

interface ErrorProps {
  message?: string | null;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorProps> = ({
  message,
  className = ''
}) => {
  if (!message) return null;
  
  return (
    <Alert 
      type="error" 
      message={message || 'Unknown error'} 
      className={className} 
    />
  );
};