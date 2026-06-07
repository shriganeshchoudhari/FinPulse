import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPanel from './LoginPanel';
import { useStore } from '../store/useStore';
import { authService } from '../services/api';

vi.mock('../services/api', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn()
  }
}));

describe('LoginPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ token: null, userId: null });
  });

  it('renders login form by default', () => {
    render(<LoginPanel />);
    expect(screen.getByText('Secure Login')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches to register form', () => {
    render(<LoginPanel />);
    const registerToggle = screen.getByText('Register');
    fireEvent.click(registerToggle);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('submits login successfully', async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({ token: 'mock-token' });
    
    render(<LoginPanel />);
    
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('testuser', 'password123');
    });

    expect(useStore.getState().token).toBe('mock-token');
  });

  it('displays error on failed login', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce({ response: { status: 401 } });
    
    render(<LoginPanel />);
    
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
