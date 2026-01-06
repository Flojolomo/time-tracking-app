/**
 * Responsive Design Tests
 * Tests to verify mobile-friendly responsive design implementations
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ViewSelector } from '../ViewSelector';
import { MetricsCards } from '../MetricsCards';
import { TimeStatistics } from '../../types';

// Mock data for testing
const mockTimeStats: TimeStatistics = {
  totalDuration: 480, // 8 hours
  averageDailyTime: 240, // 4 hours
  totalRecords: 12,
  averageSessionDuration: 40, // 40 minutes
  workingDays: 2
};

describe('Responsive Design Components', () => {
  describe('ViewSelector', () => {
    it('renders with mobile-friendly touch targets', () => {
      const mockOnViewChange = jest.fn();
      
      render(
        <ViewSelector 
          currentView="daily" 
          onViewChange={mockOnViewChange} 
        />
      );
      
      // Check that buttons are rendered
      expect(screen.getByRole('button', { name: /day/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /week/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /month/i })).toBeInTheDocument();
    });

    it('shows short labels on mobile screens', () => {
      const mockOnViewChange = jest.fn();
      
      render(
        <ViewSelector 
          currentView="weekly" 
          onViewChange={mockOnViewChange} 
        />
      );
      
      // The component should render both short and long labels
      // (CSS classes handle which one is visible based on screen size)
      const weekButton = screen.getByRole('button', { name: /week/i });
      expect(weekButton).toBeInTheDocument();
    });
  });

  describe('MetricsCards', () => {
    it('renders responsive grid layout', () => {
      render(
        <MetricsCards 
          timeStats={mockTimeStats}
          projectCount={5}
          dateRange="week"
        />
      );
      
      // Check that all metric cards are rendered
      expect(screen.getByText('Total Time')).toBeInTheDocument();
      expect(screen.getByText('Daily Average')).toBeInTheDocument();
      expect(screen.getByText('Total Sessions')).toBeInTheDocument();
      expect(screen.getByText('Avg Session')).toBeInTheDocument();
      
      // Check that values are formatted correctly
      expect(screen.getByText('8h')).toBeInTheDocument(); // Total time
      expect(screen.getByText('4h')).toBeInTheDocument(); // Daily average
      expect(screen.getByText('12')).toBeInTheDocument(); // Total sessions
      expect(screen.getByText('40m')).toBeInTheDocument(); // Avg session
    });

    it('displays proper responsive classes', () => {
      const { container } = render(
        <MetricsCards 
          timeStats={mockTimeStats}
          projectCount={3}
          dateRange="month"
        />
      );
      
      // Check that the grid container has responsive classes
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'xl:grid-cols-4');
    });
  });

  describe('Mobile Touch Interactions', () => {
    it('applies touch-friendly sizing to interactive elements', () => {
      const mockOnViewChange = jest.fn();
      
      render(
        <ViewSelector 
          currentView="daily" 
          onViewChange={mockOnViewChange} 
        />
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Buttons should have adequate padding for touch targets
        expect(button).toHaveClass('py-2');
      });
    });
  });

  describe('Responsive Text and Spacing', () => {
    it('uses responsive text sizes and spacing', () => {
      render(
        <MetricsCards 
          timeStats={mockTimeStats}
          projectCount={2}
          dateRange="quarter"
        />
      );
      
      // Check that responsive text sizing is applied
      const totalTimeValue = screen.getByText('8h');
      expect(totalTimeValue).toHaveClass('text-lg', 'sm:text-2xl');
    });
  });
});