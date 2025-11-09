import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MainApp from './MainApp';
import { useAuth } from './services/AuthContext';

// Mock the useAuth hook
vi.mock('./services/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('MainApp', () => {
  it('renders LoginView when not authenticated', () => {
    // Arrange
    (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: false });

    // Act
    render(<MainApp />);

    // Assert
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
