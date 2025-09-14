import { style, styleVariants } from '@vanilla-extract/css';

const badgeBase = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.125rem 0.625rem',
  fontSize: '0.75rem',
  fontWeight: 500,
  borderRadius: '9999px',
  border: '1px solid transparent',
  transition: 'all 0.15s ease',
});

export const variants = styleVariants({
  default: [badgeBase, {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
  }],
  primary: [badgeBase, {
    backgroundColor: 'var(--accent-bg)',
    color: 'var(--accent-text)',
    border: '1px solid var(--accent-border)',
  }],
  success: [badgeBase, {
    backgroundColor: 'var(--success-bg)',
    color: 'var(--success-text)',
    border: '1px solid var(--success-border)',
  }],
  warning: [badgeBase, {
    backgroundColor: 'var(--warning-bg)',
    color: 'var(--warning-text)',
    border: '1px solid var(--warning-border)',
  }],
  error: [badgeBase, {
    backgroundColor: 'var(--error-bg)',
    color: 'var(--error-text)',
    border: '1px solid var(--error-border)',
  }],
  info: [badgeBase, {
    backgroundColor: 'var(--info-bg)',
    color: 'var(--info-text)',
    border: '1px solid var(--info-border)',
  }],
});

export const sizes = styleVariants({
  small: {
    padding: '0.0625rem 0.5rem',
    fontSize: '0.625rem',
  },
  medium: {
    padding: '0.125rem 0.625rem',
    fontSize: '0.75rem',
  },
  large: {
    padding: '0.25rem 0.75rem',
    fontSize: '0.875rem',
  },
});

export const outlined = style({
  backgroundColor: 'transparent !important',
});

export const dot = style({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  marginRight: '0.375rem',
  backgroundColor: 'currentColor',
});