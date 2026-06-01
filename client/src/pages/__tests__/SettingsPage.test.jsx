import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  default: ({ children, title }) => (
    <div data-testid="app-shell">
      <h1>{title}</h1>
      {children}
    </div>
  )
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
      expect(toast.success).toHaveBeenCalledWith('Toutes vos données financières ont été effacées');
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
});
