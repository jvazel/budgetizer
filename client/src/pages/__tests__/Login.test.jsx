import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('Login Page', () => {
  let mockLogin;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin = vi.fn().mockResolvedValue({});
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('should render all input fields and submit button', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('Adresse email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
    expect(screen.getByText('Bon retour 👋')).toBeInTheDocument();
  });

  it('should toggle password visibility on right icon click', () => {
    renderComponent();

    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    expect(passwordInput.type).toBe('password');

    // Click the toggle button (it has lucide icons which we can target)
    const toggleButton = passwordInput.parentElement.querySelector('button');
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('should call login function with correct inputs on form submission', async () => {
    renderComponent();

    const emailInput = screen.getByPlaceholderText('Adresse email');
    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123');
      expect(toast.success).toHaveBeenCalledWith('Connexion réussie !');
    });
  });

  it('should show toast error if login fails', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: 'Identifiants invalides' } }
    });

    renderComponent();

    const emailInput = screen.getByPlaceholderText('Adresse email');
    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('wrong@example.com', 'wrongpass');
      expect(toast.error).toHaveBeenCalledWith('Identifiants invalides');
    });
  });
});
