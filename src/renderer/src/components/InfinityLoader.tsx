/**
 * InfinityLoader — an ∞ (lemniscate) with a lit segment travelling its path,
 * used to signal in-progress work (extraction / OCR / translation). On-brand
 * with the "Infinity Edition" shell; pure SVG + CSS, no host component needed.
 */
const LEMNISCATE =
  'M20,20 C20,8 36,8 40,20 C44,32 60,32 60,20 C60,8 44,8 40,20 C36,32 20,32 20,20';

export function InfinityLoader({ size = 18, title = 'Working…' }: { size?: number; title?: string }) {
  return (
    <svg
      width={(size * 80) / 40}
      height={size}
      viewBox="0 0 80 40"
      fill="none"
      role="img"
      aria-label={title}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Track */}
      <path d={LEMNISCATE} stroke="var(--border-subtle)" strokeWidth={6} strokeLinecap="round" opacity={0.5} />
      {/* Travelling lit segment */}
      <path
        className="mnemo-infinity-run"
        d={LEMNISCATE}
        pathLength={100}
        stroke="var(--active-border)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="22 78"
      />
    </svg>
  );
}
