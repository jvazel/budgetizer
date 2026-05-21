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
  ...props
}) => {
  return (
    <div className={`flex flex-col w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-2 text-sm text-secondary font-medium">
          {label}
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
          className={`
            w-full h-[52px] bg-surface-2 border border-border rounded-2xl
            text-primary placeholder:text-muted focus:outline-none focus:border-accent
            transition-colors
            ${Icon ? 'pl-12' : 'pl-4'}
            ${RightIcon ? 'pr-12' : 'pr-4'}
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
      </div>
      {error && (
        <span className="mt-1 text-sm text-danger">{error}</span>
      )}
    </div>
  );
};

export default Input;
