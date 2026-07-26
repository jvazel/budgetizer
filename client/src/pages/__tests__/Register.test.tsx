import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../Register';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('Register Page', () => {
  let mockRegister;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister = vi.fn().mockResolvedValue({});
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ register: mockRegister }}>
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('should render all input fields and submit button', () => {
    renderComponent();

    expect(screen.getByPlaceholderText('Prénom')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Adresse email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirmer le mot de passe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeInTheDocument();
  });

  it('should show validation error for password mismatch', async () => {
    renderComponent();

    const nameInput = screen.getByPlaceholderText('Prénom');
    const emailInput = screen.getByPlaceholderText('Adresse email');
    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirmer le mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Créer mon compte' });

    fireEvent.change(nameInput, { target: { value: 'Jean' } });
    fireEvent.change(emailInput, { target: { value: 'jean@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different456' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
    });
  });

  it('should show validation error for short password', async () => {
    renderComponent();

    const nameInput = screen.getByPlaceholderText('Prénom');
    const emailInput = screen.getByPlaceholderText('Adresse email');
    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirmer le mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Créer mon compte' });

    fireEvent.change(nameInput, { target: { value: 'Jean' } });
    fireEvent.change(emailInput, { target: { value: 'jean@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'abc' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'abc' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Le mot de passe doit contenir au moins 6 caractères')).toBeInTheDocument();
    });
  });

  it('should call register with correct data on successful form submission', async () => {
    renderComponent();

    const nameInput = screen.getByPlaceholderText('Prénom');
    const emailInput = screen.getByPlaceholderText('Adresse email');
    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirmer le mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Créer mon compte' });

    fireEvent.change(nameInput, { target: { value: 'Jean' } });
    fireEvent.change(emailInput, { target: { value: 'jean@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Jean', 'jean@example.com', 'Password123');
      expect(toast.success).toHaveBeenCalledWith('Compte créé avec succès !');
    });
  });
});
