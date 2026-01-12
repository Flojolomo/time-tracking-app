import React from 'react';
import { Button } from './Button';

interface ButtonGroupOption {
  value: string;
  label: string;
}

interface ButtonGroupProps {
  options: ButtonGroupOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  options,
  value,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex rounded-md shadow-sm ${className}`}>
      {options.map((option, index) => (
        <Button
          key={option.value}
          onClick={() => onChange(option.value)}
          variant={value === option.value ? 'primary' : 'secondary'}
          className={`${
            index === 0 ? 'rounded-l-md rounded-r-none' : 
            index === options.length - 1 ? 'rounded-r-md rounded-l-none' : 
            'rounded-none'
          } ${index !== 0 ? '-ml-px' : ''}`}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};