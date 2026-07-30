import React from 'react';

export interface AmountDisplayProps {
  amount: number;
  currency?: string | { code?: string; symbol?: string };
  type?: 'expense' | 'income' | 'transfer' | 'neutral';
  showSign?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  dimDecimals?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base font-semibold',
  lg: 'text-lg font-bold',
  xl: 'text-xl font-bold',
  '2xl': 'text-2xl font-extrabold',
  '3xl': 'text-3xl font-extrabold tracking-tight',
  '4xl': 'text-4xl font-black tracking-tight',
};

const typeColorClasses = {
  income: 'text-accent',
  expense: 'text-danger',
  transfer: 'text-info',
  neutral: 'text-primary',
};

/**
 * Universal component for rendering financial amounts in Bankyboard style.
 * Uses tabular numerals (font-premium-numbers), formatted integer and decimal parts,
 * dimmed cents for enhanced legibility, and color semantics.
 */
export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  currency = '€',
  type = 'neutral',
  showSign = false,
  size = 'md',
  dimDecimals = true,
  className = '',
  style,
}) => {
  // Resolve symbol
  const symbol = typeof currency === 'string' ? currency : (currency?.symbol || '€');

  // Determine sign prefix
  let sign = '';
  if (type === 'expense') {
    sign = '-';
  } else if (type === 'income') {
    sign = '+';
  } else if (showSign) {
    if (amount > 0) sign = '+';
    else if (amount < 0) sign = '-';
  } else if (amount < 0) {
    sign = '-';
  }

  // Abs value for numeric representation
  const absAmount = Math.abs(amount || 0);

  // Formatted parts via fr-FR Intl
  const formatted = absAmount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Split into integer part and decimal part (separated by comma in fr-FR)
  const parts = formatted.split(',');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00';

  const colorClass = typeColorClasses[type] || 'text-primary';
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <span
      className={`inline-flex items-baseline font-premium-numbers ${colorClass} ${sizeClass} ${className}`}
      style={style}
    >
      <span className="select-none">{sign}</span>
      <span>{integerPart}</span>
      {dimDecimals ? (
        <span className="text-[0.82em] opacity-75 font-medium">,{decimalPart}</span>
      ) : (
        <span>,{decimalPart}</span>
      )}
      <span className="ml-1 text-[0.9em] font-normal opacity-85 select-none">{symbol}</span>
    </span>
  );
};

export default AmountDisplay;
