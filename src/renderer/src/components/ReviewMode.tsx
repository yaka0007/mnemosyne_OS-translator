/**
 * ReviewMode — spaced-repetition flashcards (BETA).
 * Shows one side of a due card, reveals the answer, then grades it (Leitner).
 * Direction is toggleable: prompt with the foreign term or with its meaning.
 */
import { useMemo, useState } from 'react';
import { langName, MAX_BOX, type VocabEntry } from '../lib/store';
import { Beta } from './Beta';
import { actionBtn, primaryBtn } from '../lib/ui';

interface Props {
  queue: VocabEntry[]; // snapshot of cards to review this session
  grade: (id: string, remembered: boolean) => void;
  onExit: () => void;
}

export function ReviewMode({ queue, grade, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showSourceFirst, setShowSourceFirst] = useState(true);
  const [done, setDone] = useState(0);

  const card: VocabEntry | undefined = queue[index];

  const progress = useMemo(() => `${Math.min(index + 1, queue.length)} / ${queue.length}`, [index, queue.length]);

  if (!card) {
    return (
      <div style={centered}>
        <div style={{ fontSize: 32 }}>🎉</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>Review complete</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {done} card{done === 1 ? '' : 's'} reviewed
        </div>
        <button onClick={onExit} style={{ ...primaryBtn, marginTop: 8 }}>
          Back to repertoire
        </button>
      </div>
    );
  }

  const front = showSourceFirst ? card.sourceTerm : card.targetTerm;
  const frontLang = showSourceFirst ? card.sourceLang : card.targetLang;
  const back = showSourceFirst ? card.targetTerm : card.sourceTerm;
  const backLang = showSourceFirst ? card.targetLang : card.sourceLang;

  const advance = () => {
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const handleGrade = (remembered: boolean) => {
    grade(card.id, remembered);
    setDone((d) => d + 1);
    advance();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
        }}
      >
        <button onClick={onExit} style={actionBtn}>
          ← Exit
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Review <Beta />
        </span>
        <button
          onClick={() => setShowSourceFirst((v) => !v)}
          style={{ ...actionBtn, marginLeft: 'auto' }}
          title="Swap which side is shown first"
        >
          ⇄ {showSourceFirst ? `${langName(card.sourceLang)} → ${langName(card.targetLang)}` : `${langName(card.targetLang)} → ${langName(card.sourceLang)}`}
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{progress}</span>
      </div>

      {/* Card */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}
        onClick={() => !revealed && setRevealed(true)}
      >
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {langName(frontLang)}
        </div>
        <div style={{ fontSize: 26, fontWeight: 500, textAlign: 'center' }}>{front}</div>

        {revealed ? (
          <>
            <div style={{ width: 40, height: 1, background: 'var(--border-subtle)' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {langName(backLang)}
            </div>
            <div style={{ fontSize: 22, color: 'var(--text-primary)', textAlign: 'center' }}>{back}</div>
            {card.pos && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{card.pos}</div>}
            {card.example && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 420 }}>
                “{card.example}”
                {card.exampleTranslation && (
                  <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>“{card.exampleTranslation}”</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tap to reveal</div>
        )}
      </div>

      {/* Grade bar */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        {revealed ? (
          <>
            <button
              onClick={() => handleGrade(false)}
              style={{
                ...primaryBtn,
                background: 'var(--accent-danger-bg)',
                border: '1px solid var(--accent-danger-text)',
                color: 'var(--accent-danger-text)',
              }}
            >
              ✗ Didn’t know
            </button>
            <button
              onClick={() => handleGrade(true)}
              style={{
                ...primaryBtn,
                background: 'var(--accent-success-bg)',
                border: '1px solid var(--accent-success-text)',
                color: 'var(--accent-success-text)',
              }}
            >
              ✓ Knew it {card.box >= MAX_BOX ? '★' : ''}
            </button>
          </>
        ) : (
          <button onClick={() => setRevealed(true)} style={primaryBtn}>
            Reveal
          </button>
        )}
      </div>
    </div>
  );
}

const centered: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: 24,
  textAlign: 'center',
};
