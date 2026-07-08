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

  it('validates password length and complexity', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' });

    fireEvent.change(passwordInput, { target: { value: 'abc' } });
    fireEvent.change(confirmInput, { target: { value: 'abc' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins 6 caractères')).toBeInTheDocument();
    });
  });

  it('validates that passwords match', async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' });

    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmInput, { target: { value: 'Different456' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
    });
  });

  it('submits successfully, displays success screen and redirects to /login', async () => {
    vi.useFakeTimers();
    api.post.mockResolvedValueOnce({ data: { message: 'Mot de passe réinitialisé' } });

    renderComponent();
    const passwordInput = screen.getByPlaceholderText('Nouveau mot de passe');
    const confirmInput = screen.getByPlaceholderText('Confirmer le nouveau mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' });

    fireEvent.change(passwordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmInput, { target: { value: 'NewPass123' } });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

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

    fireEvent.change(passwordInput, { target: { value: 'NewPass123' } });
    fireEvent.change(confirmInput, { target: { value: 'NewPass123' } });
    
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(toast.error).toHaveBeenCalledWith('Token de réinitialisation invalide ou expiré');
  });
});
