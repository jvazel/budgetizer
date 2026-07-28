import React from 'react';
import { Delete } from 'lucide-react';
import { triggerHaptic } from '../../utils/hapticHelper';

interface CustomNumpadProps {
  value: string;
  onChange: (newValue: string) => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  disabled?: boolean;
}

export const CustomNumpad: React.FC<CustomNumpadProps> = ({
  value,
  onChange,
  onConfirm,
  confirmLabel = 'Valider',
  disabled = false,
}) => {
  const handleKeyPress = (key: string) => {
    if (disabled) return;
    triggerHaptic('light');

    if (key === 'backspace') {
      if (value.length <= 1) {
        onChange('');
      } else {
        onChange(value.slice(0, -1));
      }
      return;
    }

    if (key === ',') {
      if (!value) {
        onChange('0.');
        return;
      }
      if (value.includes('.') || value.includes(',')) {
        return;
      }
      onChange(value + '.');
      return;
    }

    // Checking max decimal digits (max 2 digits after decimal)
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length - decimalIndex > 2) {
      return;
    }

    // Leading zero check
    if (value === '0') {
      onChange(key);
      return;
    }

    // Limit maximum total length to 10 chars
    if (value.length >= 10) return;

    onChange(value + key);
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [',', '0', 'backspace'],
  ];

  return (
    <div className="w-full max-w-sm mx-auto select-none touch-manipulation">
      <div className="grid grid-cols-3 gap-2.5 p-1">
        {keys.flat().map((key) => {
          const isBackspace = key === 'backspace';

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => handleKeyPress(key)}
              aria-label={isBackspace ? 'Effacer' : key === ',' ? 'Virgule' : `Chiffre ${key}`}
              className={`h-14 rounded-2xl font-bold text-xl flex items-center justify-center transition-all duration-150 active-spring-sm active:scale-95 border select-none ${
                isBackspace
                  ? 'bg-surface-2/80 text-secondary border-border/40 hover:bg-surface-2 hover:text-primary'
                  : key === ','
                    ? 'bg-surface-2/50 text-primary border-border/30 hover:bg-surface-2'
                    : 'bg-surface-1 text-primary border-border/50 hover:bg-surface-2 shadow-sm'
              } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {isBackspace ? (
                <Delete size={22} className="text-secondary" />
              ) : (
                <span>{key}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CustomNumpad;
