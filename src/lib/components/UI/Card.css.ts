import { style, styleVariants } from '@vanilla-extract/css';

export const card = style({
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  transition: 'all 0.2s ease',
});

export const cardHoverable = style({
  cursor: 'pointer',
  ':hover': {
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    borderColor: 'var(--border-dark)',
  },
});

export const cardHeader = style({
  marginBottom: '1rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid var(--border-light)',
});

export const cardTitle = style({
  fontSize: '1.125rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
});

export const cardDescription = style({
  fontSize: '0.875rem',
  color: 'var(--text-secondary)',
  marginTop: '0.25rem',
});

export const cardContent = style({
  color: 'var(--text-primary)',
});

export const cardFooter = style({
  marginTop: '1rem',
  paddingTop: '1rem',
  borderTop: '1px solid var(--border-light)',
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
});

export const variants = styleVariants({
  default: {},
  elevated: {
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  outlined: {
    backgroundColor: 'transparent',
    border: '2px solid var(--border-default)',
  },
  filled: {
    backgroundColor: 'var(--bg-tertiary)',
    border: 'none',
  },
});

export const padding = styleVariants({
  none: { padding: 0 },
  small: { padding: '1rem' },
  medium: { padding: '1.5rem' },
  large: { padding: '2rem' },
});