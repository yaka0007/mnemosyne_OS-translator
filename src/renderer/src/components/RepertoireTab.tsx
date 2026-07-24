/**
 * RepertoireTab — the learned-word glossary (BETA).
 * Searchable, filterable by language pair; launches the spaced-repetition
 * review over the cards that are currently due (or all, if none are due yet).
 */
import { useMemo, useState } from 'react';
import { dueEntries, langName, MAX_BOX, type VocabEntry } from '../lib/store';
import { Beta } from './Beta';
import { ReviewMode } from './ReviewMode';
import { actionBtn, cardStyle, inputStyle, primaryBtn } from '../lib/ui';

interface Props {
  vocab: VocabEntry[];
  grade: (id: string, remembered: boolean) => void;
  remove: (id: string) => void;
}

export function RepertoireTab({ vocab, grade, remove }: Props) {
  const [search, setSearch] = useState('');
  const [pair, setPair] = useState('all');
  const [reviewQueue, setReviewQueue] = useState<VocabEntry[] | null>(null);

  const pairs = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of vocab) {
      const key = `${e.sourceLang}>${e.targetLang}`;
      if (!set.has(key)) set.set(key, `${langName(e.sourceLang)} → ${langName(e.targetLang)}`);
    }
    return Array.from(set.entries());
  }, [vocab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vocab
      .filter((e) => pair === 'all' || `${e.sourceLang}>${e.targetLang}` === pair)
      .filter(
        (e) =>
          !q ||
          e.sourceTerm.toLowerCase().includes(q) ||
          e.targetTerm.toLowerCase().includes(q) ||
          (e.note?.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => b.at - a.at);
  }, [vocab, search, pair]);

  const dueCount = useMemo(() => dueEntries(vocab, Date.now()).length, [vocab]);

  const startReview = () => {
    const now = Date.now();
    const scope = filtered.length > 0 ? filtered : vocab;
    const due = dueEntries(scope, now);
    // If nothing is due yet, let the learner drill the whole (filtered) set.
    setReviewQueue(due.length > 0 ? due : [...scope].sort((a, b) => a.due - b.due));
  };

  if (reviewQueue) {
    return <ReviewMode queue={reviewQueue} grade={grade} onExit={() => setReviewQueue(null)} />;
  }

  if (vocab.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 24,
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ fontSize: 32 }}>📖</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          Your repertoire is empty <Beta />
        </div>
        <div style={{ fontSize: 12, maxWidth: 320 }}>
          Translate something, then press <strong>Extract vocabulary</strong> to collect the words
          worth learning. They land here for review.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
          flexWrap: 'wrap',
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search words…"
          style={{ ...inputStyle, flex: 1, minWidth: 120 }}
        />
        {pairs.length > 1 && (
          <select value={pair} onChange={(e) => setPair(e.target.value)} style={inputStyle}>
            <option value="all">All pairs</option>
            {pairs.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={startReview}
          style={{ ...primaryBtn, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          🎯 Review{dueCount > 0 ? ` (${dueCount})` : ''} <Beta />
        </button>
      </div>

      {/* Count line */}
      <div style={{ padding: '6px 14px', fontSize: 10, color: 'var(--text-muted)' }}>
        {filtered.length} of {vocab.length} word{vocab.length === 1 ? '' : 's'}
        {dueCount > 0 ? ` · ${dueCount} due for review` : ' · all reviewed for now'}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((e) => (
          <div key={e.id} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{e.sourceTerm}</span>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{e.targetTerm}</span>
              {e.pos && (
                <span style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-muted)' }}>{e.pos}</span>
              )}
              <span
                title={`Leitner box ${e.box}/${MAX_BOX} — reviews: ${e.reviews}, lapses: ${e.lapses}`}
                style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}
              >
                {'●'.repeat(e.box)}
                {'○'.repeat(Math.max(0, MAX_BOX - e.box))}
              </span>
              <button
                onClick={() => remove(e.id)}
                title="Remove from repertoire"
                style={{ ...actionBtn, padding: '1px 6px', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
            {e.example && (
              <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                “{e.example}”
                {e.exampleTranslation && (
                  <span style={{ color: 'var(--text-muted)' }}> — “{e.exampleTranslation}”</span>
                )}
              </div>
            )}
            {e.note && (
              <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {e.note}
              </div>
            )}
            <div style={{ marginTop: 4, fontSize: 9, color: 'var(--text-muted)' }}>
              {langName(e.sourceLang)} → {langName(e.targetLang)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            No words match your search.
          </div>
        )}
      </div>
    </div>
  );
}
