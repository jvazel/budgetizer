import React from 'react';

const Input = ({
  label,
  type = 'text',
  id,
  value,
  onChange,
  placeholder,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconClick,
  error,
  className = '',
  suffix,
  rangeMin,
  rangeMax,
  rangeStep,
  rangeMinLabel,
  rangeMaxLabel,
  uppercaseLabel = false,
  required = false,
  ...props
}) => {
  const pct = rangeMax > rangeMin ? Math.max(0, Math.min(100, ((Number(value) || 0) - rangeMin) / (rangeMax - rangeMin) * 100)) : 0;

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`mb-1.5 text-secondary font-semibold tracking-wide ${
            uppercaseLabel ? 'text-[11px] uppercase' : 'text-sm'
          }`}
        >
          {label}
          {required && <span className="text-danger ml-1" title="Ce champ est obligatoire">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-4 text-muted">
            <Icon size={20} />
          </div>
        )}
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`
            w-full h-[52px] bg-surface-2 border border-border rounded-2xl
            text-primary placeholder:text-muted focus:outline-none focus:border-copper
            transition-colors font-semibold text-sm
            ${Icon ? 'pl-12' : 'pl-4'}
            ${RightIcon || suffix ? 'pr-12' : 'pr-4'}
            ${error ? 'border-danger focus:border-danger' : ''}
          `}
          {...props}
        />
        {RightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-4 text-muted hover:text-primary transition-colors"
          >
            <RightIcon size={20} />
          </button>
        )}
        {suffix && !RightIcon && (
          <span className="absolute right-4 text-xs font-bold text-muted pointer-events-none">
            {suffix}
          </span>
        )}
      </div>

      {rangeMin !== undefined && rangeMax !== undefined && (
        <div className="px-1 pt-1 select-none space-y-1 mt-1">
          <input
            type="range"
            min={rangeMin}
            max={rangeMax}
            step={rangeStep || props.step || 1}
            value={value}
            onChange={e => onChange && onChange({ target: { value: Number(e.target.value) } })}
            className="w-full h-1 bg-border/40 rounded-lg appearance-none cursor-pointer accent-accent transition-all hover:bg-border/60"
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`
            }}
          />
          <div className="flex justify-between text-[10px] text-muted font-bold">
            <span>{rangeMinLabel || rangeMin}</span>
            <span>{rangeMaxLabel || rangeMax}</span>
          </div>
        </div>
      )}

      {typeof error === 'string' && error && (
        <span className="mt-1 text-sm text-danger">{error}</span>
      )}
    </div>
  );
};

export default Input;
