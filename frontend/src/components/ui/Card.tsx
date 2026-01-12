import React from 'react';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  icon,
  children,
  className = ''
}) => {
  return (
    <div className={`max-w-lg w-full mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="p-2 bg-white/20 rounded-lg">
              {icon}
            </div>
          )}
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
      </div>
      
      <div className="p-8">
        {children}
      </div>
    </div>
  );
};