import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

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
    post: vi.fn(),
    get: vi.fn()
  }
}));

describe('Login Page', () => {
  let mockLogin;
  let mockSetUser;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin = vi.fn().mockResolvedValue({});
    mockSetUser = vi.fn();
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ login: mockLogin, setUser: mockSetUser }}>
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

  describe('WebAuthn / Biometrics support', () => {
    beforeEach(() => {
      // Mock WebAuthn support
      window.PublicKeyCredential = vi.fn();
      Object.defineProperty(navigator, 'credentials', {
        value: {
          get: vi.fn(),
          create: vi.fn()
        },
        configurable: true,
        writable: true
      });
      localStorage.clear();
    });

    afterEach(() => {
      delete window.PublicKeyCredential;
      Object.defineProperty(navigator, 'credentials', {
        value: undefined,
        configurable: true,
        writable: true
      });
      localStorage.clear();
    });

    it('should not render biometric button if WebAuthn is not supported', () => {
      delete window.PublicKeyCredential;
      renderComponent();
      expect(screen.queryByRole('button', { name: /Se connecter avec la biométrie/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Problème avec la biométrie/i)).not.toBeInTheDocument();
    });

    it('should render biometric button and reset button if WebAuthn is supported', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: /Se connecter avec la biométrie/i })).toBeInTheDocument();
      expect(screen.getByText(/Problème avec la biométrie/i)).toBeInTheDocument();
    });

    it('should clear localStorage and show success toast when clicking reset button', async () => {
      localStorage.setItem('webauthn_registered_on_device', 'true');
      localStorage.setItem('webauthn_dismissed_device', 'true');

      renderComponent();
      
      const resetButton = screen.getByText(/Problème avec la biométrie/i);
      fireEvent.click(resetButton);

      expect(localStorage.getItem('webauthn_registered_on_device')).toBeNull();
      expect(localStorage.getItem('webauthn_dismissed_device')).toBeNull();
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('réinitialisés'));
    });

    it('should trigger biometric login flow on button click', async () => {
      const mockGetOptions = {
        challenge: 'mockChallengeBase64url',
        allowCredentials: [{ id: 'mockIdBase64url', type: 'public-key' }]
      };
      api.post.mockResolvedValueOnce({ data: mockGetOptions });
      
      const mockAssertion = {
        id: 'mockId',
        rawId: new Uint8Array([1, 2, 3]).buffer,
        type: 'public-key',
        response: {
          clientDataJSON: new Uint8Array([4, 5, 6]).buffer,
          authenticatorData: new Uint8Array([7, 8, 9]).buffer,
          signature: new Uint8Array([10, 11, 12]).buffer,
          userHandle: null
        }
      };
      navigator.credentials.get.mockResolvedValueOnce(mockAssertion);
      
      api.post.mockResolvedValueOnce({ 
        data: { 
          _id: 'user123', 
          name: 'Test', 
          email: 'test@example.com', 
          token: 'jwt-token' 
        } 
      });

      renderComponent();

      const biometricButton = screen.getByRole('button', { name: /Se connecter avec la biométrie/i });
      fireEvent.click(biometricButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/webauthn/login/options', { email: undefined });
        expect(navigator.credentials.get).toHaveBeenCalled();
        expect(api.post).toHaveBeenCalledWith('/webauthn/login/verify', expect.any(Object));
        expect(toast.success).toHaveBeenCalledWith('Connexion biométrique réussie !');
      });
    });

    it('should handle auto-reset of localStorage flags on unknown credential error (status 400)', async () => {
      localStorage.setItem('webauthn_registered_on_device', 'true');
      localStorage.setItem('webauthn_dismissed_device', 'true');

      api.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: "Périphérique biométrique inconnu." }
        }
      });

      renderComponent();

      const biometricButton = screen.getByRole('button', { name: /Se connecter avec la biométrie/i });
      fireEvent.click(biometricButton);

      await waitFor(() => {
        expect(localStorage.getItem('webauthn_registered_on_device')).toBeNull();
        expect(localStorage.getItem('webauthn_dismissed_device')).toBeNull();
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('inconnu'));
      });
    });
  });
});
