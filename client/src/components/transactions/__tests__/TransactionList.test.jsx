import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    
    // Expense should render with minus and text-primary/80 because it is below the default 100€ threshold
    const expenseAmount = screen.getByText((content, element) => {
      return element.tagName === 'P' && element.textContent.includes('45,50') && element.textContent.startsWith('-');
    });
    expect(expenseAmount).toBeInTheDocument();
    expect(expenseAmount).toHaveClass('text-primary/80');

    // Income should render with plus
    const incomeAmount = screen.getByText((content, element) => {
      return element.tagName === 'P' && element.textContent.includes('1') && element.textContent.includes('500,00') && element.textContent.startsWith('+');
    });
    expect(incomeAmount).toBeInTheDocument();
    expect(incomeAmount).toHaveClass('text-accent');
  });

  it('renders transfer as negative and styled as expense by default (when no currentAccountId is provided)', () => {
    render(<TransactionList transactions={mockTransactions} />);
    
    const transferAmount = screen.getByText((content, element) => {
      return element.tagName === 'P' && element.textContent.includes('350,00') && element.textContent.startsWith('-');
    });
    expect(transferAmount).toBeInTheDocument();
    expect(transferAmount).toHaveClass('text-danger');
  });

  it('renders transfer as negative when currentAccountId is the source account (checking)', () => {
    render(<TransactionList transactions={mockTransactions} currentAccountId="acc_checking" />);
    
    const transferAmount = screen.getByText((content, element) => {
      return element.tagName === 'P' && element.textContent.includes('350,00') && element.textContent.startsWith('-');
    });
    expect(transferAmount).toBeInTheDocument();
    expect(transferAmount).toHaveClass('text-danger');
  });

  it('renders transfer as positive and styled as accent when currentAccountId is the destination account (credit)', () => {
    render(<TransactionList transactions={mockTransactions} currentAccountId="acc_credit" />);
    
    const transferAmount = screen.getByText((content, element) => {
      return element.tagName === 'P' && element.textContent.includes('350,00') && element.textContent.startsWith('+');
    });
    expect(transferAmount).toBeInTheDocument();
    expect(transferAmount).toHaveClass('text-accent');
  });

  it('applies text-danger to expenses equal or above threshold and text-primary/80 below it', () => {
    localStorage.setItem('budgetizer_alert_threshold', '50');
    render(<TransactionList transactions={mockTransactions} />);
    
    // Expense of 45.50 (below 50€ threshold) -> text-primary/80
    const expenseBelow = screen.getByText((content, element) => {
      return element.tagName === 'P' && element.textContent.includes('45,50') && element.textContent.startsWith('-');
    });
    expect(expenseBelow).toHaveClass('text-primary/80');
    
    // Transfer of 350.00 (above 50€ threshold) -> text-danger
    const transferAbove = screen.getByText((content, element) => {
      return element.tagName === 'P' && element.textContent.includes('350,00') && element.textContent.startsWith('-');
    });
    expect(transferAbove).toHaveClass('text-danger');
    
    localStorage.clear();
  });
});
