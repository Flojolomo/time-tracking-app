import React from 'react';

interface Tab {
  id: string;
  label: string;
  variant?: 'default' | 'danger';
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8 px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const variantClasses = tab.variant === 'danger' 
            ? isActive 
              ? 'border-red-500 text-red-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            : isActive
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${variantClasses}`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};