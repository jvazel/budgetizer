import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InstallPromptBanner from '../InstallPromptBanner';

// Mock PwaContext hook
const mockInstallApp = vi.fn();
let mockPwaState = {
  isInstallable: true,
  isStandalone: false,
  isIOS: false,
  installApp: mockInstallApp
};

vi.mock('../../../context/PwaContext', () => ({
  usePwa: () => mockPwaState
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('InstallPromptBanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();

    // Default state
    mockPwaState = {
      isInstallable: true,
      isStandalone: false,
      isIOS: false,
      installApp: mockInstallApp
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = () => {
    const result = render(<InstallPromptBanner />);
    // Advance timers for the 2000ms delay in useEffect
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    return result;
  };

  it('renders nothing if already installed (standalone mode)', () => {
    mockPwaState.isStandalone = true;
    const { container } = renderComponent();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner and installs the PWA on click', async () => {
    mockInstallApp.mockResolvedValue(true);
    renderComponent();

    expect(screen.getByText("Installer l'application")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Installer maintenant' })).toBeInTheDocument();

    const installBtn = screen.getByRole('button', { name: 'Installer maintenant' });
    fireEvent.click(installBtn);

    expect(mockInstallApp).toHaveBeenCalled();
  });

  it('dismisses the banner on close button click and sets local storage', async () => {
    renderComponent();

    expect(screen.getByText("Installer l'application")).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Fermer' });
    fireEvent.click(closeBtn);

    expect(screen.queryByText("Installer l'application")).not.toBeInTheDocument();
    expect(localStorage.getItem('pwa_install_banner_dismissed')).toBe('true');
  });

  it('shows iOS installation instruction modal when isIOS is true', () => {
    mockPwaState.isInstallable = false;
    mockPwaState.isIOS = true;

    renderComponent();

    expect(screen.getByText("Installer l'application")).toBeInTheDocument();
    
    const installBtn = screen.getByRole('button', { name: 'Installer sur iPhone' });
    fireEvent.click(installBtn);

    // Modal should be shown
    expect(screen.getByText('Ajouter Budgetizer sur iPhone')).toBeInTheDocument();
    expect(screen.getByText(/Appuyez sur le bouton de partage/)).toBeInTheDocument();
  });
});
