import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../SettingsPage';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

vi.mock('../../services/api', () => ({
  default: {
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    get: vi.fn()
  }
}));

vi.mock('../../context/PwaContext', () => ({
  usePwa: () => ({
    isInstallable: false,
    isStandalone: false,
    isIOS: false,
    installApp: vi.fn()
  })
}));

vi.mock('../../components/layout/AppShell', () => ({
  default: ({ children }) => (
    <div data-testid="app-shell">
      {children}
    </div>
  ),
  HeaderTitle: ({ children }) => <h1>{children}</h1>,
  HeaderActions: ({ children }) => <div>{children}</div>,
  HeaderBackButton: () => <button>Back</button>,
  HeaderPortalContext: React.createContext({ isScrolled: false })
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}));

describe('SettingsPage Component', () => {
  let mockUser, mockSetUser, mockLogout;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUser = {
      id: 'user_123',
      name: 'Johan V',
      email: 'johan@example.com',
      currency: { code: 'EUR', symbol: '€' },
      preferences: {
        theme: 'dark',
        dateFormat: 'DD/MM/YYYY',
        anomalyThreshold: 30,
        lowBalanceThreshold: 100
      }
    };

    mockSetUser = vi.fn();
    mockLogout = vi.fn();
  });

  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, setUser: mockSetUser, logout: mockLogout }}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders settings fields and profile card with user information', () => {
    renderComponent();

    expect(screen.getByText('Johan V')).toBeInTheDocument();
    expect(screen.getByText('johan@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Johan V')).toBeInTheDocument();
    expect(screen.getByDisplayValue('johan@example.com')).toBeInTheDocument();
  });

  it('calls update profile API and updates AuthContext on form submit', async () => {
    renderComponent();

    const nameInput = screen.getByDisplayValue('Johan V');
    fireEvent.change(nameInput, { target: { value: 'Johan Updated' } });

    const submitBtn = screen.getByRole('button', { name: 'Enregistrer le profil' });
    
    api.put.mockResolvedValue({
      data: { ...mockUser, name: 'Johan Updated' }
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/profile', {
        name: 'Johan Updated',
        email: 'johan@example.com'
      });
      expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ name: 'Johan Updated' }));
      expect(toast.success).toHaveBeenCalledWith('Profil mis à jour avec succès');
    });
  });

  it('calls update preferences API when theme is changed', async () => {
    renderComponent();

    const lightThemeBtn = screen.getByRole('button', { name: 'Clair' });
    
    api.put.mockResolvedValue({
      data: { ...mockUser, preferences: { ...mockUser.preferences, theme: 'light' } }
    });

    fireEvent.click(lightThemeBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/users/preferences', expect.objectContaining({
        theme: 'light'
      }));
      expect(mockSetUser).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Préférences enregistrées');
    });
  });

  it('opens confirmation and performs data clearing on click', async () => {
    renderComponent();

    const clearDataBtn = screen.getByRole('button', { name: 'Effacer toutes les données' });
    fireEvent.click(clearDataBtn);

    expect(screen.getByText('Effacer toutes les données ?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Tout effacer' });
    
    // Mock window reload
    const originalLocation = window.location;
    delete window.location;
    window.location = { reload: vi.fn() };

    api.delete.mockResolvedValue({});

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/users/clear');
      expect(toast.success).toHaveBeenCalledWith('Toutes tes données financières ont été effacées');
      expect(window.location.reload).toHaveBeenCalled();
    });

    // Clean up
    window.location = originalLocation;
  });

  it('opens confirmation and performs account deletion on click', async () => {
    renderComponent();

    const deleteAccountBtn = screen.getByRole('button', { name: 'Supprimer définitivement mon compte' });
    fireEvent.click(deleteAccountBtn);

    expect(screen.getByText('Supprimer mon compte ?')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Supprimer' });
    
    api.delete.mockResolvedValue({});

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/users/me');
      expect(mockLogout).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('définitivement supprimés'));
    });
  });

  describe('WebAuthn / Passkey Management', () => {
    beforeEach(() => {
      // Enable WebAuthn support
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

    it('renders biometric configuration section and loaded credentials', async () => {
      const mockCredentials = [
        { _id: 'cred_1', deviceName: 'MacBook Pro', createdAt: '2026-06-01T12:00:00.000Z' },
        { _id: 'cred_2', deviceName: 'Pixel 8', createdAt: '2026-06-02T12:00:00.000Z' }
      ];
      api.get.mockImplementation((url) => {
        if (url === '/webauthn/credentials') {
          return Promise.resolve({ data: mockCredentials });
        }
        return Promise.resolve({ data: {} });
      });

      renderComponent();

      // Verify header
      expect(screen.getByText('Connexion Biométrique (Passkeys)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Nom de l'appareil (ex: Mon MacBook)")).toBeInTheDocument();

      // Wait for credentials to load and verify rendering
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/webauthn/credentials');
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
        expect(screen.getByText('Pixel 8')).toBeInTheDocument();
      });
    });

    it('allows registering a new biometric credential', async () => {
      let credentialsList = [];
      const mockRegOptions = {
        challenge: 'mockChallengeBase64url',
        user: { id: 'mockUserId' },
        excludeCredentials: []
      };

      api.get.mockImplementation((url) => {
        if (url === '/webauthn/credentials') {
          return Promise.resolve({ data: credentialsList });
        }
        if (url === '/webauthn/register/options') {
          return Promise.resolve({ data: mockRegOptions });
        }
        return Promise.resolve({ data: {} });
      });
      
      const mockCredential = {
        id: 'newCredId',
        rawId: new Uint8Array([1, 2, 3]).buffer,
        type: 'public-key',
        response: {
          clientDataJSON: new Uint8Array([4, 5, 6]).buffer,
          attestationObject: new Uint8Array([7, 8, 9]).buffer,
          getTransports: vi.fn().mockReturnValue(['internal'])
        }
      };
      navigator.credentials.create.mockResolvedValueOnce(mockCredential);
      
      api.post.mockImplementation((url, data) => {
        if (url === '/webauthn/register/verify') {
          credentialsList = [{ _id: 'cred_new', deviceName: 'Mon iPhone', createdAt: new Date().toISOString() }];
          return Promise.resolve({ data: { verified: true } });
        }
        return Promise.resolve({ data: {} });
      });

      renderComponent();

      const nameInput = screen.getByPlaceholderText("Nom de l'appareil (ex: Mon MacBook)");
      fireEvent.change(nameInput, { target: { value: 'Mon iPhone' } });

      const submitBtn = screen.getByRole('button', { name: /^Enregistrer$/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/webauthn/register/options');
        expect(navigator.credentials.create).toHaveBeenCalled();
        expect(api.post).toHaveBeenCalledWith('/webauthn/register/verify', expect.objectContaining({
          deviceName: 'Mon iPhone'
        }));
        expect(toast.success).toHaveBeenCalledWith('Périphérique biométrique enregistré avec succès !');
        expect(localStorage.getItem('webauthn_registered_on_device')).toBe('true');
      });
    });

    it('should handle already exists / InvalidStateError during registration', async () => {
      const mockRegOptions = {
        challenge: 'mockChallengeBase64url',
        user: { id: 'mockUserId' },
        excludeCredentials: []
      };

      api.get.mockImplementation((url) => {
        if (url === '/webauthn/credentials') {
          return Promise.resolve({ data: [] });
        }
        if (url === '/webauthn/register/options') {
          return Promise.resolve({ data: mockRegOptions });
        }
        return Promise.resolve({ data: {} });
      });
      
      // Simulate InvalidStateError (passkey already exists on user's device/account)
      const error = new Error('The credential manager has already registered a credential for this...');
      error.name = 'InvalidStateError';
      navigator.credentials.create.mockRejectedValueOnce(error);

      renderComponent();

      const nameInput = screen.getByPlaceholderText("Nom de l'appareil (ex: Mon MacBook)");
      fireEvent.change(nameInput, { target: { value: 'Mon iPhone' } });

      const submitBtn = screen.getByRole('button', { name: /^Enregistrer$/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('déjà configuré'));
        expect(localStorage.getItem('webauthn_registered_on_device')).toBe('true');
      });
    });

    it('allows deleting an existing credential and resets localStorage flags', async () => {
      let mockCredentials = [
        { _id: 'cred_delete_1', deviceName: 'MacBook Pro', createdAt: '2026-06-01T12:00:00.000Z' }
      ];
      api.get.mockImplementation((url) => {
        if (url === '/webauthn/credentials') {
          return Promise.resolve({ data: mockCredentials });
        }
        return Promise.resolve({ data: {} });
      });

      localStorage.setItem('webauthn_registered_on_device', 'true');
      localStorage.setItem('webauthn_dismissed_device', 'true');

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      });

      api.delete.mockImplementationOnce(() => {
        mockCredentials = [];
        return Promise.resolve({ data: { message: 'Success' } });
      });

      const deleteBtn = screen.getByTitle('Supprimer cet appareil');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith('/webauthn/credentials/cred_delete_1');
        expect(toast.success).toHaveBeenCalledWith('Périphérique supprimé');
        expect(localStorage.getItem('webauthn_registered_on_device')).toBeNull();
        expect(localStorage.getItem('webauthn_dismissed_device')).toBeNull();
      });
    });
  });
});

