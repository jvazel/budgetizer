import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AmountDisplay from '../AmountDisplay';

describe('AmountDisplay Component', () => {
  it('renders standard amount with integer and dimmed decimal parts', () => {
    const { container } = render(<AmountDisplay amount={1234.56} />);
    expect(screen.getByText('1 234')).toBeDefined();
    expect(screen.getByText(',56')).toBeDefined();
    expect(screen.getByText('€')).toBeDefined();
  });

  it('renders income type with plus sign and accent color class', () => {
    const { container } = render(<AmountDisplay amount={500} type="income" showSign />);
    expect(screen.getByText('+')).toBeDefined();
    expect(container.firstChild).toHaveClass('text-accent');
  });

  it('renders expense type with minus sign and danger color class', () => {
    const { container } = render(<AmountDisplay amount={75.25} type="expense" showSign />);
    expect(screen.getByText('-')).toBeDefined();
    expect(container.firstChild).toHaveClass('text-danger');
  });

  it('handles negative amounts cleanly', () => {
    const { container } = render(<AmountDisplay amount={-150.00} showSign />);
    expect(screen.getByText('-')).toBeDefined();
    expect(screen.getByText('150')).toBeDefined();
    expect(screen.getByText(',00')).toBeDefined();
  });
});
