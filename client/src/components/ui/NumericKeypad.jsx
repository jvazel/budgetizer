import React from 'react';
import { Delete, Check, Equal } from 'lucide-react';

const tokenize = (expr) => {
  const cleanExpr = expr.replace(/,/g, '.').replace(/\s+/g, '');
  const regex = /(\d+\.?\d*|[+\-*/])/g;
  const rawTokens = cleanExpr.match(regex) || [];
  
  const tokens = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];
    if ((token === '-' || token === '+') && (i === 0 || ['+', '-', '*', '/'].includes(tokens[tokens.length - 1]))) {
      const nextToken = rawTokens[i + 1];
      if (nextToken && !isNaN(parseFloat(nextToken))) {
        tokens.push((token === '-' ? '-' : '') + nextToken);
        i++;
      } else {
        tokens.push(token);
      }
    } else {
      tokens.push(token);
    }
  }
  return tokens;
};

const evaluateExpression = (expr) => {
  if (!expr) return '0';
  const tokens = tokenize(expr);
  if (tokens.length === 0) return '0';
  
  // Pass 1: Multiplication and Division (order of operations)
  const pass1 = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '*' || token === '/') {
      const prevVal = parseFloat(pass1.pop());
      const nextValStr = tokens[i + 1];
      if (!nextValStr) {
        pass1.push(String(prevVal));
        break;
      }
      const nextVal = parseFloat(nextValStr);
      if (isNaN(prevVal) || isNaN(nextVal)) {
        pass1.push(String(prevVal || 0));
        i++;
        continue;
      }
      
      let intermediate = 0;
      if (token === '*') {
        intermediate = prevVal * nextVal;
      } else if (token === '/') {
        intermediate = nextVal !== 0 ? prevVal / nextVal : 0;
      }
      pass1.push(String(intermediate));
      i++;
    } else {
      pass1.push(token);
    }
  }
  
  // Pass 2: Addition and Subtraction
  if (pass1.length === 0) return '0';
  let result = parseFloat(pass1[0]);
  if (isNaN(result)) result = 0;
  
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i];
    const nextValStr = pass1[i + 1];
    if (!nextValStr) break;
    const nextVal = parseFloat(nextValStr);
    if (isNaN(nextVal)) continue;
    
    if (op === '+') {
      result += nextVal;
    } else if (op === '-') {
      result -= nextVal;
    }
  }
  
  const roundedResult = Math.round(result * 100) / 100;
  return String(roundedResult);
};

const NumericKeypad = ({ value, onChange, onSubmit, onToggleSign }) => {
  const displayValue = String(value || '');

  // An expression exists if there's any operator after the first character
  const hasOperator = 
    displayValue.slice(1).includes('+') || 
    displayValue.slice(1).includes('-') || 
    displayValue.slice(1).includes('*') || 
    displayValue.slice(1).includes('/');

  const handlePress = (key) => {
    if (key === 'del') {
      if (displayValue.length > 0) {
        onChange(displayValue.slice(0, -1));
      }
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      if (displayValue === '') {
        if (key === '-') {
          onChange('-');
        }
      } else {
        const lastChar = displayValue.slice(-1);
        if (['+', '-', '*', '/', '.'].includes(lastChar)) {
          onChange(displayValue.slice(0, -1) + key);
        } else {
          onChange(displayValue + key);
        }
      }
    } else if (key === ',') {
      const lastOpIndex = Math.max(
        displayValue.lastIndexOf('+'),
        displayValue.lastIndexOf('-'),
        displayValue.lastIndexOf('*'),
        displayValue.lastIndexOf('/')
      );
      const currentNumberPart = lastOpIndex === -1 ? displayValue : displayValue.slice(lastOpIndex + 1);
      if (!currentNumberPart.includes('.')) {
        onChange(displayValue + (currentNumberPart === '' ? '0.' : '.'));
      }
    } else if (key === '+/-') {
      if (onToggleSign) onToggleSign();
    } else if (key === 'check') {
      if (hasOperator) {
        const result = evaluateExpression(displayValue);
        onChange(result);
      } else {
        if (onSubmit) onSubmit();
      }
    } else {
      // Digit 0-9
      const lastOpIndex = Math.max(
        displayValue.lastIndexOf('+'),
        displayValue.lastIndexOf('-'),
        displayValue.lastIndexOf('*'),
        displayValue.lastIndexOf('/')
      );
      const currentNumberPart = lastOpIndex === -1 ? displayValue : displayValue.slice(lastOpIndex + 1);
      
      // Limit to 2 decimal places in current number part
      if (currentNumberPart.includes('.')) {
        const [, decimal] = currentNumberPart.split('.');
        if (decimal && decimal.length >= 2) return;
      }
      
      // Prevent multiple leading zeros
      if (currentNumberPart === '0' && key === '0') return;
      if (currentNumberPart === '0' && key !== '0' && key !== ',') {
        const prefix = lastOpIndex === -1 ? '' : displayValue.slice(0, lastOpIndex + 1);
        onChange(prefix + key);
        return;
      }
      
      onChange(displayValue + key);
    }
  };

  const numBtnClass = "h-14 flex items-center justify-center text-2xl font-semibold rounded-2xl bg-surface-2/30 hover:bg-surface-2/60 active:bg-surface-2 transition-all text-primary border border-border/5 shadow-sm";
  const opBtnClass = "h-14 flex items-center justify-center text-2xl font-bold rounded-2xl bg-surface-2/80 hover:bg-border/20 active:bg-surface-2 transition-all text-accent border border-border/10 shadow-sm";
  const delBtnClass = "h-14 flex items-center justify-center text-2xl font-bold rounded-2xl bg-surface-2/80 hover:bg-border/20 active:bg-surface-2 transition-all text-danger/80 border border-border/10 shadow-sm";
  
  return (
    <div className="grid grid-cols-4 gap-2 w-full max-w-sm mx-auto">
      {/* Row 1 */}
      <button type="button" onClick={() => handlePress('7')} className={numBtnClass}>7</button>
      <button type="button" onClick={() => handlePress('8')} className={numBtnClass}>8</button>
      <button type="button" onClick={() => handlePress('9')} className={numBtnClass}>9</button>
      <button type="button" onClick={() => handlePress('/')} className={opBtnClass}>÷</button>

      {/* Row 2 */}
      <button type="button" onClick={() => handlePress('4')} className={numBtnClass}>4</button>
      <button type="button" onClick={() => handlePress('5')} className={numBtnClass}>5</button>
      <button type="button" onClick={() => handlePress('6')} className={numBtnClass}>6</button>
      <button type="button" onClick={() => handlePress('*')} className={opBtnClass}>×</button>

      {/* Row 3 */}
      <button type="button" onClick={() => handlePress('1')} className={numBtnClass}>1</button>
      <button type="button" onClick={() => handlePress('2')} className={numBtnClass}>2</button>
      <button type="button" onClick={() => handlePress('3')} className={numBtnClass}>3</button>
      <button type="button" onClick={() => handlePress('-')} className={opBtnClass}>-</button>

      {/* Row 4 */}
      <button type="button" onClick={() => handlePress(',')} className={numBtnClass}>,</button>
      <button type="button" onClick={() => handlePress('0')} className={numBtnClass}>0</button>
      <button type="button" onClick={() => handlePress('del')} className={delBtnClass}><Delete size={26} /></button>
      <button type="button" onClick={() => handlePress('+')} className={opBtnClass}>+</button>

      {/* Row 5 */}
      <button type="button" onClick={() => handlePress('+/-')} className={`${opBtnClass} text-xl`}>+/-</button>
      <button 
        type="button" 
        onClick={() => handlePress('check')} 
        className={`col-span-3 h-14 flex items-center justify-center rounded-2xl transition-all shadow-md text-white active:scale-95 ${
          hasOperator 
            ? 'bg-purple hover:bg-purple/80 shadow-purple/20' 
            : 'bg-accent hover:bg-accent-dim shadow-accent/20'
        }`}
      >
        {hasOperator ? <Equal size={26} /> : <Check size={26} />}
      </button>
    </div>
  );
};

export default NumericKeypad;


