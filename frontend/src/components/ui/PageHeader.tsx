import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex justify-center sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
};