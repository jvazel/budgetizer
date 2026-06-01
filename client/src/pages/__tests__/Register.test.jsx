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

  it('should validate password mismatch and show error toast', async () => {
    renderComponent();

    const nameInput = screen.getByPlaceholderText('Prénom');
    const emailInput = screen.getByPlaceholderText('Adresse email');
    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirmer le mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Créer mon compte' });

    fireEvent.change(nameInput, { target: { value: 'Jean' } });
    fireEvent.change(emailInput, { target: { value: 'jean@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });

    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith('Les mots de passe ne correspondent pas');
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should validate password length and show error toast', async () => {
    renderComponent();

    const nameInput = screen.getByPlaceholderText('Prénom');
    const emailInput = screen.getByPlaceholderText('Adresse email');
    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirmer le mot de passe');
    const submitBtn = screen.getByRole('button', { name: 'Créer mon compte' });

    fireEvent.change(nameInput, { target: { value: 'Jean' } });
    fireEvent.change(emailInput, { target: { value: 'jean@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '12345' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '12345' } });

    fireEvent.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith('Le mot de passe doit contenir au moins 6 caractères');
    expect(mockRegister).not.toHaveBeenCalled();
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
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Jean', 'jean@example.com', 'password123');
      expect(toast.success).toHaveBeenCalledWith('Compte créé avec succès !');
    });
  });
});
