import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AmountInput from '../AmountInput';

describe('AmountInput Component', () => {
  it('renders correctly with default props', () => {
    render(<AmountInput value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('0.00');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('€')).toBeInTheDocument();
  });

  it('displays the correct sign prefix based on transaction type', () => {
    const { rerender } = render(<AmountInput value="10" onChange={() => {}} type="expense" />);
    expect(screen.getByText('-')).toBeInTheDocument();

    rerender(<AmountInput value="10" onChange={() => {}} type="income" />);
    expect(screen.getByText('+')).toBeInTheDocument();

    rerender(<AmountInput value="10" onChange={() => {}} type="transfer" />);
    expect(screen.queryByText('+')).not.toBeInTheDocument();
    expect(screen.queryByText('-')).not.toBeInTheDocument();
  });

  it('triggers onChange and converts comma to dot', () => {
    const handleChange = vi.fn();
    render(<AmountInput value="" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('0.00');

    fireEvent.change(input, { target: { value: '12,5' } });
    expect(handleChange).toHaveBeenCalledWith('12.5');
  });

  it('automatically prefixes single dot with zero', () => {
    const handleChange = vi.fn();
    render(<AmountInput value="" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('0.00');

    fireEvent.change(input, { target: { value: '.' } });
    expect(handleChange).toHaveBeenCalledWith('0.');
  });

  it('restricts input to maximum of 2 decimal places', () => {
    const handleChange = vi.fn();
    render(<AmountInput value="12.34" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('0.00');

    // Trying to type 12.345 (which violates the regex)
    fireEvent.change(input, { target: { value: '12.345' } });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('prevents multiple leading zeros', () => {
    const handleChange = vi.fn();
    render(<AmountInput value="" onChange={handleChange} />);
    const input = screen.getByPlaceholderText('0.00');

    fireEvent.change(input, { target: { value: '05' } });
    expect(handleChange).toHaveBeenCalledWith('5');
  });

  it('applies autofocus if prop is set', async () => {
    render(<AmountInput value="" onChange={() => {}} autoFocus={true} />);
    const input = screen.getByPlaceholderText('0.00');
    
    // Wait for the timeout inside component (150ms)
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(document.activeElement).toBe(input);
  });
});
