import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from '../ResetPassword';
import toast from 'react-hot-toast';
import api from '../../services/api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: 'my-reset-token' }),
    useNavigate: () => mockNavigate
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}));

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('ResetPassword Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );
  };

  it('renders inputs and submit button correctly', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('Nouveau mot de passe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirmer le nouveau mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' })).toBeInTheDocument();
  });

  it('toggles password field type when clicking right icon', () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    expect(passwordInput.type).toBe('password');

    const toggleButton = passwordInput.parentElement.querySelector('button');
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('validates password length (> 5 characters)', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' });

    fireEvent.change(passwordInput, { target: { value: '12345' } });
    fireEvent.change(confirmInput, { target: { value: '12345' } });
    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith('Le mot de passe doit contenir au moins 6 caractères');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('validates that passwords match', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'different123' } });
    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith('Les mots de passe ne correspondent pas');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits successfully, displays success screen and redirects to /login', async () => {
    vi.useFakeTimers();
    api.post.mockResolvedValueOnce({ data: { message: 'Mot de passe réinitialisé' } });

    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' });

    fireEvent.change(passwordInput, { target: { value: 'my-new-password' } });
    fireEvent.change(confirmInput, { target: { value: 'my-new-password' } });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(api.post).toHaveBeenCalledWith('/auth/reset-password/my-reset-token', { password: 'my-new-password' });
    expect(toast.success).toHaveBeenCalledWith('Mot de passe réinitialisé !');

    // Verify success UI
    expect(screen.getByText('Réinitialisation réussie')).toBeInTheDocument();

    // Advance timer to trigger redirection (3000ms)
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('displays toast error when API request fails', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: 'Token de réinitialisation invalide ou expiré' } }
    });

    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' });

    fireEvent.change(passwordInput, { target: { value: 'my-new-password' } });
    fireEvent.change(confirmInput, { target: { value: 'my-new-password' } });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(api.post).toHaveBeenCalledWith('/auth/reset-password/my-reset-token', { password: 'my-new-password' });
    expect(toast.error).toHaveBeenCalledWith('Token de réinitialisation invalide ou expiré');
  });
});
