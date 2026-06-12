import React, { useRef, useEffect } from 'react';
import { triggerHaptic } from '../../utils/hapticHelper';

const AmountInput = ({
  value,
  onChange,
  type = 'expense',
  currencySymbol = '€',
  placeholder = '0.00',
  autoFocus = false,
  className = ''
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small timeout to ensure sheet transitions or modal opening are complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleTextChange = (e) => {
    triggerHaptic('light');
    let val = e.target.value;
    
    // Replace commas with dots
    val = val.replace(',', '.');
    
    // Allow digits, up to one dot, and up to 2 decimal places
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      // Prevent multiple leading zeros (e.g., "05" -> "5", but allow "0." and "0")
      if (val.length > 1 && val.startsWith('0') && val[1] !== '.') {
        val = val.replace(/^0+/, '');
        if (val === '') val = '0';
      }
      
      // Auto-prefix single dot with 0
      if (val === '.') {
        val = '0.';
      }
      
      onChange(val);
    }
  };

  const getSign = () => {
    if (type === 'expense') return '-';
    if (type === 'income') return '+';
    return ''; // No sign for transfers
  };

  const getColorClass = () => {
    if (type === 'expense') return 'text-danger focus:border-danger';
    if (type === 'income') return 'text-accent focus:border-accent';
    return 'text-accent focus:border-accent'; // Transfers are accent-colored
  };

  return (
    <div className={`flex flex-col items-center justify-center py-2 ${className}`}>
      <div className="flex items-center justify-center font-mono select-none">
        {/* Sign Prefix */}
        {getSign() && (
          <span className={`text-4xl md:text-5xl font-extrabold mr-1.5 transition-colors duration-200 ${
            type === 'expense' ? 'text-danger' : 'text-accent'
          }`}>
            {getSign()}
          </span>
        )}
        
        {/* Main Input */}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*"
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          className={`
            w-48 text-center bg-transparent border-b-2 border-border/40 
            text-4xl md:text-5xl font-extrabold tracking-tight focus:outline-none 
            transition-colors duration-200 py-1
            placeholder:text-muted/40
            ${getColorClass()}
          `}
        />
        
        {/* Currency Suffix */}
        <span className="text-2xl md:text-3xl font-bold text-muted ml-2">
          {currencySymbol}
        </span>
      </div>
    </div>
  );
};

export default AmountInput;
