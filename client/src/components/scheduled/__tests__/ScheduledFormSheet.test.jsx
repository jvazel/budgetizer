import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScheduledFormSheet from '../ScheduledFormSheet';

// Mock hooks
const mockAccounts = [
  { _id: 'acc1', name: 'Compte Courant', balance: 1200, currency: 'EUR' },
  { _id: 'acc2', name: 'Épargne', balance: 5000, currency: 'EUR' }
];
const mockCategoriesTree = {
  expense: [
    { _id: 'cat1', name: 'Alimentation', icon: '🍔', children: [] }
  ],
  income: [
    { _id: 'cat2', name: 'Salaire', icon: '💼', children: [] }
  ]
};

vi.mock('../../../hooks/useAccounts', () => ({
  useAccounts: () => ({ accounts: mockAccounts })
}));

vi.mock('../../../hooks/useCategories', () => ({
  useCategories: () => ({ categoriesTree: mockCategoriesTree })
}));

describe('ScheduledFormSheet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ScheduledFormSheet isOpen={false} onClose={() => {}} onSave={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders fields and triggers onSave with form data', async () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <ScheduledFormSheet 
        isOpen={true} 
        onClose={handleClose} 
        onSave={handleSave} 
      />
    );

    expect(screen.getByText('Nouvelle planification')).toBeInTheDocument();

    // Verify tabs
    expect(screen.getByRole('button', { name: 'Dépense' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revenu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Virement' })).toBeInTheDocument();

    // Amount input
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '29.99' } });

    // Description
    const descInput = screen.getByLabelText(/Nom \/ Description/);
    fireEvent.change(descInput, { target: { value: 'Abonnement Netflix' } });

    // Select category button (custom category tree trigger)
    const selectCatBtn = screen.getByRole('button', { name: 'Choisir une catégorie' });
    fireEvent.click(selectCatBtn);

    // Select Alimentation category
    const catOption = screen.getByRole('button', { name: /Alimentation/ });
    fireEvent.click(catOption);

    // Click submit button "Créer la planification"
    const submitBtn = screen.getByRole('button', { name: 'Créer la planification' });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      amount: 29.99,
      description: 'Abonnement Netflix',
      categoryId: 'cat1',
      accountId: 'acc1',
      frequency: {
        every: 1,
        unit: 'month'
      },
      autoConfirm: true,
      isSubscription: false
    }));
  });

  it('handles switching tabs to Virement (transfer)', () => {
    render(<ScheduledFormSheet isOpen={true} onClose={() => {}} onSave={() => {}} />);
    
    // Switch to Virement
    const transferTab = screen.getByRole('button', { name: 'Virement' });
    fireEvent.click(transferTab);

    // Should render target account selector
    expect(screen.getByLabelText('Vers le compte')).toBeInTheDocument();
    // Category select should be hidden in transfer mode
    expect(screen.queryByRole('button', { name: 'Choisir une catégorie' })).not.toBeInTheDocument();
  });
});
