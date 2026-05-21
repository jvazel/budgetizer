import React from 'react';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  fullWidth = false,
}) => {
  const baseStyles = 'flex items-center justify-center font-medium rounded-2xl transition-all duration-200';
  
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-dim shadow-sm',
    secondary: 'bg-surface-2 text-primary hover:bg-elevated',
    danger: 'bg-danger text-white hover:bg-danger-dim',
    ghost: 'bg-transparent text-primary hover:bg-surface-2',
    icon: 'p-3 bg-surface-2 text-primary hover:bg-elevated rounded-full',
  };

  const sizes = {
    normal: 'h-[52px] px-6 text-[16px]',
    icon: 'h-12 w-12',
  };

  const classes = `
    ${baseStyles}
    ${variants[variant]}
    ${variant === 'icon' ? sizes.icon : sizes.normal}
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
};

export default Button;
