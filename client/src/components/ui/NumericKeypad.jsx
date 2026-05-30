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

const KeypadButton = ({ value, onClick, className, children }) => {
  const lastTouchTime = React.useRef(0);

  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevents touch delay, ghost clicks, and layout shifts due to keyboard dismissal
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    lastTouchTime.current = Date.now();
    onClick(value);
  };

  const handleCustomClick = (e) => {
    // Prevent double execution on mobile emulators or hybrid browsers
    if (Date.now() - lastTouchTime.current < 500) {
      return;
    }
    onClick(value);
  };

  return (
    <button
      type="button"
      onTouchStart={handleTouchStart}
      onClick={handleCustomClick}
      className={`${className} cursor-pointer select-none touch-manipulation`}
    >
      {children || value}
    </button>
  );
};

const NumericKeypad = ({ value, onChange, onSubmit, showSubmit = true }) => {
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
      <KeypadButton value="7" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="8" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="9" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="/" onClick={handlePress} className={opBtnClass}>÷</KeypadButton>

      {/* Row 2 */}
      <KeypadButton value="4" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="5" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="6" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="*" onClick={handlePress} className={opBtnClass}>×</KeypadButton>

      {/* Row 3 */}
      <KeypadButton value="1" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="2" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="3" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="-" onClick={handlePress} className={opBtnClass}>-</KeypadButton>

      {/* Row 4 */}
      <KeypadButton value="," onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="0" onClick={handlePress} className={numBtnClass} />
      <KeypadButton value="del" onClick={handlePress} className={delBtnClass}><Delete size={26} /></KeypadButton>
      <KeypadButton value="+" onClick={handlePress} className={opBtnClass}>+</KeypadButton>

      {/* Row 5 */}
      {showSubmit && (
        <KeypadButton
          value="check"
          onClick={handlePress}
          className={`col-span-4 h-14 flex items-center justify-center rounded-2xl transition-all shadow-md text-white active:scale-95 ${
            hasOperator 
              ? 'bg-purple hover:bg-purple/80 shadow-purple/20' 
              : 'bg-accent hover:bg-accent-dim shadow-accent/20'
          }`}
        >
          {hasOperator ? <Equal size={26} /> : <Check size={26} />}
        </KeypadButton>
      )}
    </div>
  );
};

export default NumericKeypad;


