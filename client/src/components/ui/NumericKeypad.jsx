import React from 'react';
import { Delete, Check } from 'lucide-react';

const NumericKeypad = ({ value, onChange, onSubmit, onToggleSign }) => {
  const handlePress = (key) => {
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (key === ',') {
      if (!value.includes('.')) {
        onChange(value + (value === '' ? '0.' : '.'));
      }
    } else if (key === '+/-') {
      if (onToggleSign) onToggleSign();
    } else if (key === 'check') {
      onSubmit();
    } else {
      // Prevent more than 2 decimal places
      if (value.includes('.')) {
        const [, decimal] = value.split('.');
        if (decimal && decimal.length >= 2) return;
      }
      // Prevent multiple leading zeros
      if (value === '0' && key === '0') return;
      if (value === '0' && key !== '0' && key !== ',') {
         onChange(key);
         return;
      }
      
      onChange(value + key);
    }
  };

  const btnClass = "h-14 flex items-center justify-center text-2xl font-medium rounded-2xl active:bg-surface transition-colors";

  return (
    <div className="grid grid-cols-4 gap-2 w-full max-w-sm mx-auto">
      <button type="button" onClick={() => handlePress('7')} className={btnClass}>7</button>
      <button type="button" onClick={() => handlePress('8')} className={btnClass}>8</button>
      <button type="button" onClick={() => handlePress('9')} className={btnClass}>9</button>
      <button type="button" onClick={() => handlePress('del')} className={`${btnClass} text-muted`}><Delete size={28} /></button>

      <button type="button" onClick={() => handlePress('4')} className={btnClass}>4</button>
      <button type="button" onClick={() => handlePress('5')} className={btnClass}>5</button>
      <button type="button" onClick={() => handlePress('6')} className={btnClass}>6</button>
      <button type="button" onClick={() => handlePress('+/-')} className={`${btnClass} text-muted text-xl`}>+/-</button>

      <button type="button" onClick={() => handlePress('1')} className={btnClass}>1</button>
      <button type="button" onClick={() => handlePress('2')} className={btnClass}>2</button>
      <button type="button" onClick={() => handlePress('3')} className={btnClass}>3</button>
      <button type="button" onClick={() => handlePress(',')} className={btnClass}>,</button>

      <button type="button" onClick={() => handlePress('000')} className={`${btnClass} text-xl`}>000</button>
      <button type="button" onClick={() => handlePress('0')} className={btnClass}>0</button>
      <button type="button" onClick={() => handlePress('check')} className={`${btnClass} col-span-2 bg-accent text-white hover:bg-accent-dim shadow-sm`}>
        <Check size={32} />
      </button>
    </div>
  );
};

export default NumericKeypad;
