/**
 * ui.ts — Shared inline style tokens for the Translator cartridge.
 * Colors always go through the theme CSS variables (see globals.css); never
 * hardcode a hex here so light/dark stay in sync with the host.
 */
import type { CSSProperties } from 'react';

export const selectStyle: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  padding: '4px 8px',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};

export const iconBtn: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  outline: 'none',
  cursor: 'pointer',
};

export const textareaStyle: CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  resize: 'none',
  padding: 14,
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: 13,
  lineHeight: 1.6,
  outline: 'none',
  overflowY: 'auto',
};

export const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 12px',
  background: 'var(--bg-panel)',
  borderTop: '1px solid var(--border-subtle)',
};

export const actionBtn: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 4,
  color: 'var(--text-secondary)',
  padding: '3px 8px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const primaryBtn: CSSProperties = {
  background: 'var(--active-bg)',
  border: '1px solid var(--active-border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  padding: '8px 24px',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

export const cardStyle: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: '10px 12px',
};

export const inputStyle: CSSProperties = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  padding: '6px 10px',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
};
