import { style, styleVariants } from '@vanilla-extract/css';

const buttonBase = style({
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  outline: 'none',
  ':focus-visible': {
    boxShadow: '0 0 0 2px var(--border-focus)',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const variants = styleVariants({
  primary: [buttonBase, {
    backgroundColor: 'var(--accent-primary)',
    color: 'white',
    ':hover': {
      backgroundColor: 'var(--accent-hover)',
    },
  }],
  secondary: [buttonBase, {
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    ':hover': {
      backgroundColor: 'var(--bg-tertiary)',
      borderColor: 'var(--border-dark)',
    },
  }],
  ghost: [buttonBase, {
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    ':hover': {
      backgroundColor: 'var(--bg-secondary)',
    },
  }],
  danger: [buttonBase, {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: '1px solid var(--error-border)',
    ':hover': {
      backgroundColor: 'var(--error-hover)',
    },
  }],
});

export const sizes = styleVariants({
  small: {
    padding: '0.25rem 0.75rem',
    fontSize: '0.75rem',
  },
  medium: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
  },
  large: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
  },
});

export const fullWidth = style({
  width: '100%',
});