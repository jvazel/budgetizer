import React from 'react';
import { triggerHaptic } from '../../utils/hapticHelper';

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
    primary: 'bg-copper text-white hover:bg-copper-hover active:scale-[0.98] shadow-sm',
    secondary: 'bg-surface-2 text-primary border border-border/40 hover:bg-elevated hover:border-border/80 active:scale-[0.98]',
    danger: 'bg-danger text-white hover:opacity-95 active:scale-[0.98]',
    info: 'bg-info text-white hover:opacity-95 active:scale-[0.98] shadow-sm',
    ghost: 'bg-transparent text-primary hover:bg-surface-2 active:opacity-80',
    icon: 'p-3 bg-surface-2 text-primary hover:bg-elevated rounded-full active:scale-95',
    copper: 'bg-copper text-white hover:bg-copper-hover active:scale-[0.98] shadow-sm',
    accent: 'bg-accent text-white hover:opacity-95 active:scale-[0.98] shadow-sm',
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

  const handleClick = (e) => {
    triggerHaptic('light');
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
};

export default Button;
