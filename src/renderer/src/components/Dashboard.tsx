/**
 * Dashboard — the cartridge's landing surface.
 *  • CRM-style stat tiles (documents, words, languages)
 *  • an inline QuickTranslate card for fast text jobs
 *  • a searchable history of everything translated (typed text and files)
 */
import { useMemo, useState } from 'react';
import type { TranslatorBridge } from '../hooks/useBridge';
import type { ModelApi } from '../hooks/useModel';
import type { RememberMeta } from '../hooks/useTranslations';
import { langName, type TranslationRecord, type VocabEntry } from '../lib/store';
import { computeStats, fmtNum } from '../lib/stats';
import { QuickTranslate, type QuickPreload } from './QuickTranslate';
import { CopyButton } from './CopyButton';
import { actionBtn, cardStyle, inputStyle } from '../lib/ui';

interface Props {
  bridge: TranslatorBridge;
  model: ModelApi;
  history: TranslationRecord[];
  sourceLang: string;
  targetLang: string;
  setSourceLang: (v: string) => void;
  setTargetLang: (v: string) => void;
  onTranslated: (sl: string, tl: string, source: string, result: string, meta?: RememberMeta) => void;
  onVocabExtracted: (entries: VocabEntry[]) => number;
  removeTranslation: (id: string) => void;
  clearHistory: () => void;
  notify: (msg: string, kind: 'error' | 'success') => void;
}

function fmtDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function Dashboard(props: Props) {
  const { bridge, model, history, onTranslated, onVocabExtracted, removeTranslation, clearHistory, notify } = props;
  const [search, setSearch] = useState('');
  const [onlyFiles, setOnlyFiles] = useState(false);
  const [preload, setPreload] = useState<QuickPreload | null>(null);

  const stats = useMemo(() => computeStats(history), [history]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history
      .filter((r) => !onlyFiles || !!r.fileName)
      .filter(
        (r) =>
          !q ||
          r.source.toLowerCase().includes(q) ||
          r.result.toLowerCase().includes(q) ||
          (r.fileName?.toLowerCase().includes(q) ?? false),
      );
  }, [history, search, onlyFiles]);

  const openRecord = (r: TranslationRecord) => {
    props.setSourceLang(r.sourceLang);
    props.setTargetLang(r.targetLang);
    setPreload({ source: r.source, result: r.result, fileName: r.fileName, ocrUsed: r.ocrUsed });
  };

  const exportOne = (r: TranslationRecord) => {
    const body = `# ${langName(r.sourceLang)} → ${langName(r.targetLang)}\n\n## Source\n\n${r.source}\n\n## Translation\n\n${r.result}\n`;
    const blob = new Blob([body], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (r.fileName ? r.fileName.replace(/\.[^.]+$/, '') : 'translation') + `_${r.targetLang}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: 'Translations', value: fmtNum(stats.total) },
    { label: 'Documents', value: fmtNum(stats.files), hint: stats.ocr > 0 ? `${stats.ocr} via OCR` : undefined },
    { label: 'Words', value: fmtNum(stats.words) },
    { label: 'Languages', value: fmtNum(stats.languages) },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {tiles.map((t) => (
          <div key={t.label} style={{ ...cardStyle, padding: '12px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{t.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.label}</div>
            {t.hint && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{t.hint}</div>}
          </div>
        ))}
      </div>

      {/* Quick translate */}
      <QuickTranslate
        bridge={bridge}
        model={model}
        sourceLang={props.sourceLang}
        targetLang={props.targetLang}
        setSourceLang={props.setSourceLang}
        setTargetLang={props.setTargetLang}
        onTranslated={onTranslated}
        onVocabExtracted={onVocabExtracted}
        notify={notify}
        preload={preload}
        onPreloadConsumed={() => setPreload(null)}
      />

      {/* History + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>History</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search translations…" style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={onlyFiles} onChange={(e) => setOnlyFiles(e.target.checked)} /> Files only
        </label>
        {history.length > 0 && (
          <button
            onClick={() => { if (window.confirm('Delete all translation history?')) clearHistory(); }}
            style={{ ...actionBtn, color: 'var(--accent-danger-text)' }}
          >
            Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{ padding: '30px 20px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          Nothing translated yet — your history and files will appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {filtered.length} of {history.length} translation{history.length === 1 ? '' : 's'}
          </div>
          {filtered.map((r) => (
            <div key={r.id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{langName(r.sourceLang)} → {langName(r.targetLang)}</span>
                {r.fileName ? (
                  <span style={badge} title={r.fileName}>📎 {r.fileName}{r.ocrUsed ? ' · OCR' : ''}</span>
                ) : (
                  <span style={{ ...badge, color: 'var(--text-muted)' }}>✎ typed</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(r.at)}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                {r.source.slice(0, 140)}{r.source.length > 140 ? '…' : ''}
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-primary)' }}>
                → {r.result.slice(0, 140)}{r.result.length > 140 ? '…' : ''}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <button onClick={() => openRecord(r)} style={actionBtn}>↗ Open</button>
                <CopyButton text={r.result} />
                <button onClick={() => exportOne(r)} style={actionBtn}>💾 Export</button>
                <button onClick={() => removeTranslation(r.id)} style={{ ...actionBtn, marginLeft: 'auto', color: 'var(--text-muted)' }} title="Delete">✕</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No translations match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}

const badge: React.CSSProperties = {
  fontSize: 10,
  color: 'var(--text-secondary)',
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
