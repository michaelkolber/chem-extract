import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClearTableButton from './ClearTableButton'; // Adjust path if needed
import '@testing-library/jest-dom'; // For additional matchers

describe('ClearTableButton Component', () => {
  // Mock the compounds map prop
  const mockCompounds = {
    clear: vi.fn(),
    // Add other Map methods if ClearTableButton uses them, though it only uses clear
  };

  // Mock the optional onConfirm prop
  const mockOnConfirm = vi.fn();

  // Hold the original window.confirm
  let originalConfirm: (message?: string) => boolean;

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Backup original window.confirm and mock it
    originalConfirm = window.confirm;
    window.confirm = vi.fn();
  });

  afterEach(() => {
    // Restore original window.confirm after each test
    window.confirm = originalConfirm;
  });

  it('should render the button correctly', () => {
    render(<ClearTableButton compounds={mockCompounds} />);
    const button = screen.getByRole('button', { name: /clear table/i });
    expect(button).toBeInTheDocument();
    // Check for icon if necessary, though checking text is usually sufficient
  });

  it('should call compounds.clear and onConfirm when user confirms', () => {
    // Arrange: Mock confirm to return true
    (window.confirm as vi.Mock).mockReturnValue(true);
    render(<ClearTableButton compounds={mockCompounds} onConfirm={mockOnConfirm} />);
    const button = screen.getByRole('button', { name: /clear table/i });

    // Act: Click the button
    fireEvent.click(button);

    // Assert
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to clear the entire table?');
    expect(mockCompounds.clear).toHaveBeenCalledOnce();
    expect(mockOnConfirm).toHaveBeenCalledOnce();
  });

   it('should NOT call compounds.clear or onConfirm when user cancels', () => {
    // Arrange: Mock confirm to return false
    (window.confirm as vi.Mock).mockReturnValue(false);
     render(<ClearTableButton compounds={mockCompounds} onConfirm={mockOnConfirm} />);
    const button = screen.getByRole('button', { name: /clear table/i });

    // Act: Click the button
    fireEvent.click(button);

    // Assert
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to clear the entire table?');
    expect(mockCompounds.clear).not.toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

   it('should call only compounds.clear when user confirms and onConfirm is not provided', () => {
    // Arrange: Mock confirm to return true
    (window.confirm as vi.Mock).mockReturnValue(true);
    // Render without onConfirm prop
    render(<ClearTableButton compounds={mockCompounds} />);
    const button = screen.getByRole('button', { name: /clear table/i });

    // Act: Click the button
    fireEvent.click(button);

    // Assert
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(mockCompounds.clear).toHaveBeenCalledOnce();
    // mockOnConfirm should not have been called as it wasn't passed
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
