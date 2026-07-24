/**
 * CopyButton — copies text to the clipboard and shows a transient "✓ Copied"
 * state so the click has visible feedback. Falls back to "Copy failed" if the
 * clipboard API rejects (e.g. no permission).
 */
import { useEffect, useRef, useState } from 'react';
import { actionBtn } from '../lib/ui';

type CopyState = 'idle' | 'copied' | 'error';

export function CopyButton({
  text,
  label = '📋 Copy',
  style,
}: {
  text: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (s: CopyState) => {
    setState(s);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1400);
  };

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      flash('copied');
    } catch {
      flash('error');
    }
  };

  const color =
    state === 'copied'
      ? 'var(--accent-success-text)'
      : state === 'error'
        ? 'var(--accent-danger-text)'
        : (style?.color ?? actionBtn.color);
  const border =
    state === 'copied'
      ? '1px solid var(--accent-success-text)'
      : state === 'error'
        ? '1px solid var(--accent-danger-text)'
        : (style?.border ?? actionBtn.border);

  return (
    <button
      onClick={handleClick}
      style={{ ...actionBtn, ...style, color, border }}
      title="Copy to clipboard"
    >
      {state === 'copied' ? '✓ Copied' : state === 'error' ? '⚠ Failed' : label}
    </button>
  );
}
