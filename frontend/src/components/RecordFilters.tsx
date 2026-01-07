import React, { useState, useEffect, useMemo } from 'react';
import { TimeRecordFilters } from '../types';
import { TimeRecordService } from '../utils/timeRecordService';

interface RecordFiltersProps {
  filters: TimeRecordFilters;
  onFiltersChange: (filters: TimeRecordFilters) => void;
  className?: string;
}

export const RecordFilters: React.FC<RecordFiltersProps> = ({
  filters,
  onFiltersChange,
  className = ''
}) => {
  const [projectSuggestions, setProjectSuggestions] = useState<string[]>([]);
  const [projectQuery, setProjectQuery] = useState(filters.projectName || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(filters.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Load project suggestions when component mounts or query changes
  useEffect(() => {
    const loadProjectSuggestions = async () => {
      try {
        const suggestions = await TimeRecordService.getProjectSuggestions(projectQuery);
        setProjectSuggestions(suggestions);
      } catch (error) {
        console.error('Error loading project suggestions:', error);
        setProjectSuggestions([]);
      }
    };

    if (projectQuery.length > 0) {
      loadProjectSuggestions();
    } else {
      setProjectSuggestions([]);
    }
  }, [projectQuery]);

  // Load available tags from existing records
  useEffect(() => {
    const loadAvailableTags = async () => {
      try {
        // Get all records to extract unique tags
        const records = await TimeRecordService.getTimeRecords();
        const allTags = new Set<string>();
        
        records.forEach(record => {
          if (record.tags) {
            record.tags.forEach(tag => allTags.add(tag));
          }
        });
        
        setAvailableTags(Array.from(allTags).sort());
      } catch (error) {
        console.error('Error loading available tags:', error);
        setAvailableTags([]);
      }
    };

    loadAvailableTags();
  }, []);

  // Handle project filter change
  const handleProjectChange = (projectName: string) => {
    setProjectQuery(projectName);
    setShowProjectSuggestions(false);
    
    const newFilters = {
      ...filters,
      projectName: projectName.trim() || undefined
    };
    
    onFiltersChange(newFilters);
  };

  // Handle project input change
  const handleProjectInputChange = (value: string) => {
    setProjectQuery(value);
    setShowProjectSuggestions(value.length > 0);
    
    // If input is cleared, clear the filter
    if (value.trim() === '') {
      const newFilters = {
        ...filters,
        projectName: undefined
      };
      onFiltersChange(newFilters);
    }
  };

  // Handle tag addition
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      const newTags = [...selectedTags, trimmedTag];
      setSelectedTags(newTags);
      setTagInput('');
      
      const newFilters = {
        ...filters,
        tags: newTags.length > 0 ? newTags : undefined
      };
      
      onFiltersChange(newFilters);
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
    
    const newFilters = {
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined
    };
    
    onFiltersChange(newFilters);
  };

  // Handle tag input key press
  const handleTagInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && selectedTags.length > 0) {
      // Remove last tag if backspace is pressed on empty input
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setProjectQuery('');
    setSelectedTags([]);
    setTagInput('');
    setShowProjectSuggestions(false);
    
    const newFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate
    };
    
    onFiltersChange(newFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(filters.projectName || (filters.tags && filters.tags.length > 0));
  }, [filters.projectName, filters.tags]);

  // Filter available tags to exclude already selected ones
  const filteredAvailableTags = useMemo(() => {
    return availableTags.filter(tag => 
      !selectedTags.includes(tag) && 
      tag.toLowerCase().includes(tagInput.toLowerCase())
    );
  }, [availableTags, selectedTags, tagInput]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none focus:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Project Filter */}
        <div className="relative">
          <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <div className="relative">
            <input
              id="project-filter"
              type="text"
              value={projectQuery}
              onChange={(e) => handleProjectInputChange(e.target.value)}
              onFocus={() => setShowProjectSuggestions(projectQuery.length > 0)}
              onBlur={() => {
                // Delay hiding suggestions to allow for clicks
                setTimeout(() => setShowProjectSuggestions(false), 200);
              }}
              placeholder="Filter by project..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            
            {/* Project Suggestions Dropdown */}
            {showProjectSuggestions && projectSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                {projectSuggestions.map((project, index) => (
                  <button
                    key={index}
                    onClick={() => handleProjectChange(project)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {project}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tags Filter */}
        <div>
          <label htmlFor="tags-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="space-y-2">
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-600 focus:outline-none focus:bg-indigo-200 focus:text-indigo-600"
                    >
                      <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
                        <path fillRule="evenodd" d="M5.354 4L8 6.646 6.646 8 4 5.354 1.354 8 0 6.646 2.646 4 0 1.354 1.354 0 4 2.646 6.646 0 8 1.354 5.354 4z" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Tag Input */}
            <div className="relative">
              <input
                id="tags-filter"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyPress}
                placeholder="Add tag filter..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              
              {/* Available Tags Suggestions */}
              {tagInput.length > 0 && filteredAvailableTags.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-40 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {filteredAvailableTags.slice(0, 10).map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => handleAddTag(tag)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Active filters: 
            {filters.projectName && (
              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Project: {filters.projectName}
              </span>
            )}
            {filters.tags && filters.tags.length > 0 && (
              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                Tags: {filters.tags.length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};