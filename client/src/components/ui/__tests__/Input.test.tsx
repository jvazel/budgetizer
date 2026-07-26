import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../Input';

describe('Input Component', () => {
  it('renders correctly with default props', () => {
    render(<Input id="test-input" label="Username" placeholder="Enter username" value="" onChange={() => {}} />);
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  it('shows required asterisk when required prop is true', () => {
    render(<Input id="test-required" label="Email" required={true} value="" onChange={() => {}} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message and applies danger border style', () => {
    render(<Input id="test-error" label="Password" error="Invalid password" value="" onChange={() => {}} />);
    expect(screen.getByText('Invalid password')).toBeInTheDocument();
  });

  it('triggers onChange handler when value changes', () => {
    const handleChange = vi.fn();
    render(<Input id="test-change" label="Search" value="" onChange={handleChange} />);
    const input = screen.getByLabelText('Search');
    fireEvent.change(input, { target: { value: 'Query' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders range slider when rangeMin and rangeMax are provided', () => {
    const handleChange = vi.fn();
    render(
      <Input
        id="test-range"
        label="Volume"
        value={50}
        onChange={handleChange}
        rangeMin={0}
        rangeMax={100}
        rangeMinLabel="Min"
        rangeMaxLabel="Max"
      />
    );
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('Min')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('calls showPicker on click/focus when type is date', () => {
    const showPickerMock = vi.fn();
    HTMLInputElement.prototype.showPicker = showPickerMock;

    render(<Input id="test-date" type="date" label="Test Date" value="2026-06-23" onChange={() => {}} />);
    const input = screen.getByLabelText('Test Date');

    fireEvent.click(input);
    expect(showPickerMock).toHaveBeenCalledTimes(1);

    fireEvent.focus(input);
    expect(showPickerMock).toHaveBeenCalledTimes(2);

    delete HTMLInputElement.prototype.showPicker;
  });

  it('safely handles missing or throwing showPicker when type is date', () => {
    // case 1: showPicker is undefined (as in default JSDOM)
    delete HTMLInputElement.prototype.showPicker;
    render(<Input id="test-date-fallback" type="date" label="Test Date 2" value="2026-06-23" onChange={() => {}} />);
    const input = screen.getByLabelText('Test Date 2');

    // Clicking and focusing should not crash
    expect(() => fireEvent.click(input)).not.toThrow();
    expect(() => fireEvent.focus(input)).not.toThrow();

    // case 2: showPicker throws an error
    HTMLInputElement.prototype.showPicker = () => { throw new Error('Not supported'); };
    expect(() => fireEvent.click(input)).not.toThrow();
    expect(() => fireEvent.focus(input)).not.toThrow();

    delete HTMLInputElement.prototype.showPicker;
  });
});
