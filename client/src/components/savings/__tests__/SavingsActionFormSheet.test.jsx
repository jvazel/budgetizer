import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavingsActionFormSheet from '../SavingsActionFormSheet';
import api from '../../../services/api';

const mockAccounts = [
  { _id: 'acc1', name: 'Compte Courant', balance: 1200, type: 'checking', currency: 'EUR' },
  { _id: 'acc2', name: 'Livret A', balance: 5000, type: 'savings', currency: 'EUR' },
  { _id: 'acc3', name: 'LDD', balance: 1000, type: 'savings', currency: 'EUR' }
];

const mockCategoriesTree = {
  expense: [
    { _id: 'cat1', name: 'Épargne', icon: '🐷', children: [] }
  ],
  income: [
    { _id: 'cat2', name: 'Retrait Épargne', icon: '💰', children: [] }
  ]
};

vi.mock('../../../hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: mockAccounts })
}));

vi.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({ categoriesTree: mockCategoriesTree })
}));

vi.mock('../../../services/api', () => ({
  default: {
    post: vi.fn()
  }
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('SavingsActionFormSheet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <SavingsActionFormSheet isOpen={false} onClose={() => {}} goal={null} actionType="deposit" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders normal deposit form fields when no account is linked to the goal', () => {
    const goal = { _id: 'goal1', name: 'Vacances', targetAmount: 2000, currentAmount: 500, icon: '✈️' };

    const { container } = render(
      <SavingsActionFormSheet isOpen={true} onClose={() => {}} goal={goal} actionType="deposit" />
    );

    expect(screen.getByText("Ajouter de l'épargne")).toBeInTheDocument();
    expect(container.querySelector('input[type="number"]')).toBeInTheDocument();
    expect(container.querySelectorAll('select')[0]).toBeInTheDocument(); // Account select
    expect(container.querySelectorAll('select')[1]).toBeInTheDocument(); // Category select
  });

  it('renders transfer deposit form and filters accounts when account is linked to the goal', () => {
    const goal = {
      _id: 'goal1',
      name: 'Fonds de Secours',
      targetAmount: 5000,
      currentAmount: 1000,
      icon: '🐷',
      accountId: { _id: 'acc2', name: 'Livret A' }
    };

    const { container } = render(
      <SavingsActionFormSheet isOpen={true} onClose={() => {}} goal={goal} actionType="deposit" />
    );

    expect(screen.getByText("Ajouter de l'épargne")).toBeInTheDocument();
    expect(container.querySelector('select')).toBeInTheDocument();
    // Category selection should NOT be visible when transferring
    expect(container.querySelectorAll('select').length).toBe(1);

    // Accounts list should exclude the target account 'Livret A' (acc2)
    const options = Array.from(container.querySelectorAll('option'));
    expect(options.some(o => o.textContent.includes('Compte Courant') && o.textContent.includes('1') && o.textContent.includes('200'))).toBe(true);
    expect(options.some(o => o.textContent.includes('LDD') && o.textContent.includes('1') && o.textContent.includes('000'))).toBe(true);
    expect(options.some(o => o.textContent.includes('Livret A'))).toBe(false);

    // Verification message is shown
    expect(screen.getByText(/Le versement sera crédité sur le compte lié à cet objectif/)).toBeInTheDocument();
  });

  it('submits regular expense when no account is linked', async () => {
    const goal = { _id: 'goal1', name: 'Vacances', targetAmount: 2000, currentAmount: 500, icon: '✈️' };
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    const { container } = render(
      <SavingsActionFormSheet isOpen={true} onClose={handleClose} goal={goal} actionType="deposit" onSuccess={handleSuccess} />
    );

    // Enter amount
    const amountInput = container.querySelector('input[type="number"]');
    fireEvent.change(amountInput, { target: { value: '150.00' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: "Confirmer le versement" });
    api.post.mockResolvedValue({});
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/transactions', expect.objectContaining({
        type: 'expense',
        amount: 150,
        accountId: 'acc1',
        savingsGoalId: 'goal1'
      }));
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('submits transfer when account is linked', async () => {
    const goal = {
      _id: 'goal1',
      name: 'Fonds de Secours',
      targetAmount: 5000,
      currentAmount: 1000,
      icon: '🐷',
      accountId: { _id: 'acc2', name: 'Livret A' }
    };
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    const { container } = render(
      <SavingsActionFormSheet isOpen={true} onClose={handleClose} goal={goal} actionType="deposit" onSuccess={handleSuccess} />
    );

    // Enter amount
    const amountInput = container.querySelector('input[type="number"]');
    fireEvent.change(amountInput, { target: { value: '250.00' } });

    // Select source account (acc3)
    const sourceSelect = container.querySelector('select');
    fireEvent.change(sourceSelect, { target: { value: 'acc3' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: "Confirmer le versement" });
    api.post.mockResolvedValue({});
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/transactions', expect.objectContaining({
        type: 'transfer',
        amount: 250,
        accountId: 'acc3',
        toAccountId: 'acc2',
        savingsGoalId: 'goal1'
      }));
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
