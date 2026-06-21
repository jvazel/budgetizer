import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Select = ({
  children,
  value,
  onChange,
  name,
  id,
  className = '',
  placeholder = 'Sélectionnez...',
  disabled = false,
  error,
  label,
  align = 'left',
  required = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Flatten and recursively parse children to find option elements & groups
  const options = [];
  const parseChildren = (nodes) => {
    React.Children.forEach(nodes, child => {
      if (child === null || child === undefined) return;
      
      if (child.type === 'option') {
        options.push({
          type: 'option',
          value: child.props.value !== undefined ? child.props.value : child.props.children,
          label: child.props.children
        });
      } else if (child.type === 'optgroup') {
        options.push({
          type: 'groupLabel',
          label: child.props.label
        });
        if (child.props.children) {
          parseChildren(child.props.children);
        }
      } else if (Array.isArray(child)) {
        parseChildren(child);
      } else if (child.props && child.props.children) {
        parseChildren(child.props.children);
      }
    });
  };

  parseChildren(children);

  // Find currently selected option
  const currentOption = options.find(opt => opt.type === 'option' && String(opt.value) === String(value));
  const displayLabel = currentOption ? currentOption.label : placeholder;

  // Handle option click
  const handleSelect = (optValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      onChange({
        target: {
          name,
          id,
          value: optValue
        }
      });
    }
  };

  // Close when clicking outside the component
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if we are using an inline compact style (typically filters) or full form style
  const isFilter = className.includes('py-2') || className.includes('px-3') || (className.includes('h-') === false && className.includes('py-1'));

  // Clean trigger classes to build a nice trigger button
  const triggerClasses = `
    flex items-center justify-between text-left transition-all duration-200 cursor-pointer w-full
    ${className || 'h-[52px] bg-surface-2 border border-border rounded-2xl px-4 text-primary focus:outline-none focus:border-accent'}
    ${error ? 'border-danger focus:border-danger' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${isOpen ? 'border-accent ring-2 ring-accent/10' : ''}
  `;

  return (
    <div 
      ref={containerRef} 
      className={`
        relative flex flex-col 
        ${className.includes('w-full') ? 'w-full' : (isFilter ? 'w-auto inline-flex' : 'w-full')}
        ${className.includes('flex-1') ? 'flex-1' : ''}
        ${className.includes('w-max') ? 'w-max' : ''}
      `}
    >
      {label && (
        <label htmlFor={id} className="mb-2 text-sm text-secondary font-medium">
          {label}
          {required && <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span>}
        </label>
      )}
      
      <button
        type="button"
        id={id ? `${id}-trigger` : undefined}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={triggerClasses}
        disabled={disabled}
        {...props}
      >
        <span className="truncate pr-2">{displayLabel}</span>
        <ChevronDown 
          size={isFilter ? 14 : 18} 
          className={`text-muted transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-accent' : ''}`}
        />
      </button>

      {/* Backing native select for accessibility and testing support */}
      <select
        id={id}
        name={name}
        value={value ?? ''}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
        required={required}
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        }}
      >
        {options.map((opt, idx) => {
          if (opt.type === 'groupLabel') {
            return null;
          }
          return (
            <option key={`${opt.value}-${idx}`} value={opt.value}>
              {String(opt.label)}
            </option>
          );
        })}
      </select>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`
              absolute mt-2 bg-elevated/95 backdrop-blur-md border border-border/80
              rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto no-scrollbar py-1.5
              ${align === 'right' ? 'right-0 left-auto origin-top-right' : 'left-0 right-auto origin-top-left'}
              ${isFilter ? 'top-full min-w-[160px] w-max max-w-xs' : 'top-full w-full'}
            `}
          >
            {options.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-muted italic">
                Aucune option
              </div>
            ) : (
              options.map((opt, idx) => {
                if (opt.type === 'groupLabel') {
                  return (
                    <div 
                      key={`group-${idx}`}
                      className="px-4 py-1.5 mt-2 first:mt-0 text-[10px] font-extrabold uppercase text-muted tracking-wider select-none border-b border-border/20 pb-1 mb-1"
                    >
                      {opt.label}
                    </div>
                  );
                }

                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold
                      transition-colors duration-150 group
                      ${isSelected ? 'bg-accent/10 text-accent' : 'text-primary hover:bg-surface-2'}
                    `}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check size={14} className="text-accent shrink-0 ml-2 animate-fadeIn" />
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {error && (
        <span className="mt-1 text-sm text-danger">{error}</span>
      )}
    </div>
  );
};

export default Select;
