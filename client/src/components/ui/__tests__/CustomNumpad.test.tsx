import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CustomNumpad from '../CustomNumpad';

describe('CustomNumpad Component', () => {
  it('renders all numeric buttons (0-9, comma, backspace)', () => {
    render(<CustomNumpad value="" onChange={vi.fn()} />);

    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: `Chiffre ${i}` })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Virgule' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effacer' })).toBeInTheDocument();
  });

  it('handles digit clicks correctly', () => {
    const handleChange = vi.fn();
    render(<CustomNumpad value="1" onChange={handleChange} />);

    const button5 = screen.getByRole('button', { name: 'Chiffre 5' });
    fireEvent.click(button5);

    expect(handleChange).toHaveBeenCalledWith('15');
  });

  it('handles backspace click correctly', () => {
    const handleChange = vi.fn();
    render(<CustomNumpad value="12" onChange={handleChange} />);

    const backspaceButton = screen.getByRole('button', { name: 'Effacer' });
    fireEvent.click(backspaceButton);

    expect(handleChange).toHaveBeenCalledWith('1');
  });

  it('clears to empty string when backspace is clicked on a single digit', () => {
    const handleChange = vi.fn();
    render(<CustomNumpad value="5" onChange={handleChange} />);

    const backspaceButton = screen.getByRole('button', { name: 'Effacer' });
    fireEvent.click(backspaceButton);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('handles decimal comma correctly when value is empty', () => {
    const handleChange = vi.fn();
    render(<CustomNumpad value="" onChange={handleChange} />);

    const commaButton = screen.getByRole('button', { name: 'Virgule' });
    fireEvent.click(commaButton);

    expect(handleChange).toHaveBeenCalledWith('0.');
  });

  it('prevents multiple decimal points', () => {
    const handleChange = vi.fn();
    render(<CustomNumpad value="12.5" onChange={handleChange} />);

    const commaButton = screen.getByRole('button', { name: 'Virgule' });
    fireEvent.click(commaButton);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('limits decimal places to 2 digits', () => {
    const handleChange = vi.fn();
    render(<CustomNumpad value="12.50" onChange={handleChange} />);

    const button3 = screen.getByRole('button', { name: 'Chiffre 3' });
    fireEvent.click(button3);

    expect(handleChange).not.toHaveBeenCalled();
  });
});
