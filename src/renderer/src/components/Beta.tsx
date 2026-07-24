/** A small "BETA" badge for the language-learning features (extraction + review). */
export function Beta({ style }: { style?: React.CSSProperties }) {
  return (
    <span
      title="Beta feature — extraction runs an extra model pass"
      style={{
        display: 'inline-block',
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '0.08em',
        lineHeight: 1,
        padding: '2px 4px',
        borderRadius: 3,
        color: 'var(--active-border)',
        border: '1px solid var(--active-border)',
        background: 'var(--active-bg)',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      BETA
    </span>
  );
}
