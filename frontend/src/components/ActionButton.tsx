import React from 'react';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyle: React.CSSProperties = {
    padding: '12px 24px',
    borderRadius: 'var(--radius-pill)',
    border: 'none',
    fontSize: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled || isLoading ? 0.7 : 1,
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: 'white',
      boxShadow: 'var(--shadow-md)',
    },
    secondary: {
      backgroundColor: 'white',
      color: 'var(--color-primary)',
      border: '2px solid var(--color-primary)',
    },
    danger: {
      backgroundColor: 'var(--color-accent)',
      color: 'white',
    }
  };

  return (
    <button 
      style={{ ...baseStyle, ...variants[variant] }} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

