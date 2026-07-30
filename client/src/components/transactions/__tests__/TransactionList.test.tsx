import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionList from '../TransactionList';

describe('TransactionList Component', () => {
  const mockTransactions = [
    {
      _id: 'tx_exp',
      type: 'expense',
      amount: 45.5,
      date: '2026-06-08T12:00:00.000Z',
      description: 'Supermarché',
      categoryId: { name: 'Alimentation', icon: '🍔', color: '#ff0000' },
      accountId: { name: 'Compte Courant', color: '#0000ff' }
    },
    {
      _id: 'tx_inc',
      type: 'income',
      amount: 1500,
      date: '2026-06-08T12:00:00.000Z',
      description: 'Salaire',
      categoryId: { name: 'Travail', icon: '💼', color: '#00ff00' },
      accountId: { name: 'Compte Courant', color: '#0000ff' }
    },
    {
      _id: 'tx_trsf',
      type: 'transfer',
      amount: 350,
      date: '2026-06-08T12:00:00.000Z',
      description: 'Remboursement crédit',
      accountId: { _id: 'acc_checking', name: 'Compte Courant', color: '#0000ff' },
      toAccountId: { _id: 'acc_credit', name: 'Crédit Immo', color: '#ff00ff' }
    }
  ];

  it('renders list of transactions grouped by date', () => {
    render(<TransactionList transactions={mockTransactions} />);
    expect(screen.getByText('Supermarché')).toBeInTheDocument();
    expect(screen.getByText('Salaire')).toBeInTheDocument();
    expect(screen.getByText('Remboursement crédit')).toBeInTheDocument();
  });

  it('renders expense as negative and income as positive', () => {
    render(<TransactionList transactions={mockTransactions} />);
    
    // Expense should render with minus and text-danger
    const expenseAmount = screen.getByText((content, element) => {
      const txt = element.textContent?.replace(/\s+/g, '') || '';
      return (element.tagName === 'SPAN' || element.tagName === 'P') && txt.includes('-45,50€') && element.classList.contains('font-premium-numbers');
    });
    expect(expenseAmount).toBeInTheDocument();
    expect(expenseAmount).toHaveClass('text-danger');

    // Income should render with plus
    const incomeAmount = screen.getByText((content, element) => {
      const txt = element.textContent?.replace(/\s+/g, '') || '';
      return (element.tagName === 'SPAN' || element.tagName === 'P') && txt.includes('+1500,00€') && element.classList.contains('font-premium-numbers');
    });
    expect(incomeAmount).toBeInTheDocument();
    expect(incomeAmount).toHaveClass('text-accent');
  });

  it('renders transfer as negative and styled as expense by default (when no currentAccountId is provided)', () => {
    render(<TransactionList transactions={mockTransactions} />);
    
    const transferAmount = screen.getByText((content, element) => {
      const txt = element.textContent?.replace(/\s+/g, '') || '';
      return (element.tagName === 'SPAN' || element.tagName === 'P') && txt.includes('-350,00€') && element.classList.contains('font-premium-numbers');
    });
    expect(transferAmount).toBeInTheDocument();
    expect(transferAmount).toHaveClass('text-danger');
  });

  it('renders transfer as negative when currentAccountId is the source account (checking)', () => {
    render(<TransactionList transactions={mockTransactions} currentAccountId="acc_checking" />);
    
    const transferAmount = screen.getByText((content, element) => {
      const txt = element.textContent?.replace(/\s+/g, '') || '';
      return (element.tagName === 'SPAN' || element.tagName === 'P') && txt.includes('-350,00€') && element.classList.contains('font-premium-numbers');
    });
    expect(transferAmount).toBeInTheDocument();
    expect(transferAmount).toHaveClass('text-danger');
  });

  it('renders transfer as positive and styled as accent when currentAccountId is the destination account (credit)', () => {
    render(<TransactionList transactions={mockTransactions} currentAccountId="acc_credit" />);
    
    const transferAmount = screen.getByText((content, element) => {
      const txt = element.textContent?.replace(/\s+/g, '') || '';
      return (element.tagName === 'SPAN' || element.tagName === 'P') && txt.includes('+350,00€') && element.classList.contains('font-premium-numbers');
    });
    expect(transferAmount).toBeInTheDocument();
    expect(transferAmount).toHaveClass('text-accent');
  });

  it('applies text-danger to expenses and text-accent to income', () => {
    localStorage.setItem('budgetizer_alert_threshold', '50');
    render(<TransactionList transactions={mockTransactions} />);
    
    const expenseBelow = screen.getByText((content, element) => {
      const txt = element.textContent?.replace(/\s+/g, '') || '';
      return (element.tagName === 'SPAN' || element.tagName === 'P') && txt.includes('-45,50€') && element.classList.contains('font-premium-numbers');
    });
    expect(expenseBelow).toHaveClass('text-danger');
    
    const transferAbove = screen.getByText((content, element) => {
      const txt = element.textContent?.replace(/\s+/g, '') || '';
      return (element.tagName === 'SPAN' || element.tagName === 'P') && txt.includes('-350,00€') && element.classList.contains('font-premium-numbers');
    });
    expect(transferAbove).toHaveClass('text-danger');
    
    localStorage.clear();
  });

  it('triggers onEdit when modifier button is clicked', () => {
    const onEditMock = vi.fn();
    render(<TransactionList transactions={mockTransactions} onEdit={onEditMock} />);
    
    const modifierButtons = screen.getAllByRole('button', { name: /modifier/i });
    expect(modifierButtons.length).toBe(3);
    
    fireEvent.click(modifierButtons[0]);
    expect(onEditMock).toHaveBeenCalledTimes(1);
    expect(onEditMock).toHaveBeenCalledWith(mockTransactions[0]);
  });

  it('triggers onDelete when supprimer button is clicked', () => {
    const onDeleteMock = vi.fn();
    render(<TransactionList transactions={mockTransactions} onDelete={onDeleteMock} />);
    
    const supprimerButtons = screen.getAllByRole('button', { name: /supprimer/i });
    expect(supprimerButtons.length).toBe(3);
    
    fireEvent.click(supprimerButtons[0]);
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
    expect(onDeleteMock).toHaveBeenCalledWith(mockTransactions[0]);
  });
});
