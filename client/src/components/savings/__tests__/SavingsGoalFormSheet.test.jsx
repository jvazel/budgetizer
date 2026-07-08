import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavingsGoalFormSheet from '../SavingsGoalFormSheet';

const mockAccounts = [
  { _id: 'acc1', name: 'Compte Courant', balance: 1200, currency: 'EUR' },
  { _id: 'acc2', name: 'Livret A', balance: 5000, currency: 'EUR' }
];

vi.mock('../../../hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: mockAccounts })
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('SavingsGoalFormSheet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <SavingsGoalFormSheet isOpen={false} onClose={() => {}} onSave={async () => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders form fields when open including account dropdown', () => {
    const { container } = render(
      <SavingsGoalFormSheet isOpen={true} onClose={() => {}} onSave={async () => {}} />
    );

    expect(screen.getByText("Nouvel objectif d'épargne")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Fonds de secours, Apport maison...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: 5000")).toBeInTheDocument();
    expect(container.querySelector('input[type="date"]')).toBeInTheDocument();
    expect(container.querySelector('select')).toBeInTheDocument();
    
    const options = Array.from(container.querySelectorAll('option'));
    expect(options.some(o => o.textContent.includes('Compte Courant') && o.textContent.includes('1') && o.textContent.includes('200'))).toBe(true);
    expect(options.some(o => o.textContent.includes('Livret A') && o.textContent.includes('5') && o.textContent.includes('000'))).toBe(true);
  });

  it('allows filling inputs and submitting the form with accountId', async () => {
    const handleSave = vi.fn().mockResolvedValue({});
    const handleClose = vi.fn();

    const { container } = render(
      <SavingsGoalFormSheet
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    // Enter name
    const nameInput = screen.getByPlaceholderText("Ex: Fonds de secours, Apport maison...");
    fireEvent.change(nameInput, { target: { value: 'Vacances Japon' } });

    // Enter target amount
    const targetInput = screen.getByPlaceholderText("Ex: 5000");
    fireEvent.change(targetInput, { target: { value: '3000' } });

    // Select associated account
    const accountSelect = container.querySelector('select');
    fireEvent.change(accountSelect, { target: { value: 'acc2' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: "Créer l'objectif" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Vacances Japon',
        targetAmount: 3000,
        accountId: 'acc2'
      }));
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('populates fields when initialData is provided', async () => {
    const initialData = {
      _id: 'goal123',
      name: 'Fonds de Secours',
      targetAmount: 10000,
      targetDate: '2027-12-31T00:00:00.000Z',
      icon: '🐷',
      color: '#ef4444',
      accountId: 'acc2'
    };

    const { container } = render(
      <SavingsGoalFormSheet
        isOpen={true}
        onClose={() => {}}
        onSave={async () => {}}
        initialData={initialData}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Modifier l'objectif")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Ex: Fonds de secours, Apport maison...").value).toBe('Fonds de Secours');
      expect(screen.getByPlaceholderText("Ex: 5000").value).toBe('10000');
      expect(container.querySelector('select').value).toBe('acc2');
    });
  });
});
