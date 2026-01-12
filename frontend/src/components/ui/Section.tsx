import React from 'react';

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export const Section: React.FC<SectionProps> = ({
  title,
  children,
  className = '',
  headerClassName = ''
}) => {
  return (
    <div className={`bg-white p-4 sm:p-6 rounded-lg shadow ${className}`}>
      {title && (
        <h3 className={`text-base sm:text-lg font-medium text-gray-900 mb-4 ${headerClassName}`}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};