/**
 * Translator cartridge — shell.
 *
 * Three surfaces:
 *   • Dashboard   — CRM-style stats, a quick-translate card, and a searchable
 *                   history of every translation (typed text and files).
 *   • Files       — the document pipeline (PDF/DOCX/EPUB/TXT/MD, OCR), a queue
 *                   that extracts → translates each file. Kept separate because
 *                   OCR is a heavy multi-stage process while .md is near-instant.
 *   • Repertoire  — the learned-word glossary and spaced-repetition review (BETA).
 *
 * The engine (Auto / Local / Cloud) is chosen globally and applied per call via
 * the host `forceMode`. Local stores (history + vocab) are the source of truth,
 * best-effort mirrored into this app's sandbox vault (doc 58): translations →
 * SOCIAL_NODE, vocabulary → REFERENCE (canonical taxa; the old SOCIAL_CONTACT
 * was not a real taxon, so its tile metric never counted).
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslatorBridge } from './hooks/useBridge';
import { useTranslations, type RememberMeta } from './hooks/useTranslations';
import { useVocab } from './hooks/useVocab';
import { useModel } from './hooks/useModel';
import { Dashboard } from './components/Dashboard';
import { FilesTab } from './components/FilesTab';
import { RepertoireTab } from './components/RepertoireTab';
import { Beta } from './components/Beta';
import { langName, type VocabEntry } from './lib/store';

type Tab = 'dashboard' | 'files' | 'repertoire';

const TRANSLATION_SPINE = 'SOCIAL_NODE';
const VOCAB_SPINE = 'REFERENCE';

export default function App() {
  const bridge = useTranslatorBridge();
  const model = useModel(bridge);
  const { history, remember, remove: removeTranslation, clear: clearHistory } = useTranslations();
  const { vocab, addMany, grade, remove } = useVocab();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('fr');
  const [forceOcr, setForceOcr] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sandboxVault, setSandboxVault] = useState('');

  const notify = (msg: string, kind: 'error' | 'success') => {
    if (kind === 'error') {
      setError(msg);
      setSuccess(null);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccess(msg);
      setError(null);
      setTimeout(() => setSuccess(null), 2500);
    }
  };

  // Inherit theme from the host shell.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'MNEMO_THEME_SYNC') {
        document.documentElement.setAttribute('data-theme', e.data.theme);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Ensure the walled-off sandbox vault, then declare its Vault Pad tile.
  useEffect(() => {
    if (!bridge.connected) return;
    let cancelled = false;
    (async () => {
      try {
        const sb = await bridge.ensureSandbox();
        if (cancelled || !sb?.vault) return;
        setSandboxVault(sb.vault);
        await bridge.describeVaultTile({
          icon: '🌐',
          metrics: [
            { label: 'Translations', spine: TRANSLATION_SPINE },
            { label: 'Words', spine: VOCAB_SPINE },
          ],
        });
      } catch (err) {
        console.warn('[Translator] sandbox vault ensure failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bridge]);

  // Mirror remembered translations into the sandbox — idempotent per vault.
  useEffect(() => {
    if (!sandboxVault.startsWith('APP-') || history.length === 0) return;
    let cancelled = false;
    (async () => {
      const key = `translator_synced_v1:${sandboxVault}`;
      let synced: Record<string, true> = {};
      try {
        synced = JSON.parse(localStorage.getItem(key) || '{}');
      } catch {
        synced = {};
      }
      let pushed = 0;
      for (const r of history) {
        if (synced[r.id]) continue;
        const date = new Date(r.at).toISOString().slice(0, 10);
        const content =
          `Translation (${langName(r.sourceLang)} → ${langName(r.targetLang)}), ${date}. ` +
          `Source: "${r.source.slice(0, 1000)}". Result: "${r.result.slice(0, 6000)}".`;
        try {
          await bridge.socialIngest(sandboxVault, content, TRANSLATION_SPINE);
          if (cancelled) return;
          synced[r.id] = true;
          pushed++;
        } catch (err) {
          console.warn('[Translator] translation sync failed', err);
        }
      }
      if (pushed > 0 && !cancelled) {
        localStorage.setItem(key, JSON.stringify(synced));
        console.log(`[Translator] ${pushed} translation(s) catalogued into ${sandboxVault}`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxVault, history]);

  // Mirror learned words into the sandbox as REFERENCE chronicles — idempotent.
  useEffect(() => {
    if (!sandboxVault.startsWith('APP-') || vocab.length === 0) return;
    let cancelled = false;
    (async () => {
      const key = `translator_vocab_synced_v1:${sandboxVault}`;
      let synced: Record<string, true> = {};
      try {
        synced = JSON.parse(localStorage.getItem(key) || '{}');
      } catch {
        synced = {};
      }
      let pushed = 0;
      for (const v of vocab) {
        if (synced[v.id]) continue;
        const parts = [
          `Vocabulary (${langName(v.sourceLang)} → ${langName(v.targetLang)}): "${v.sourceTerm}" = "${v.targetTerm}"`,
          v.pos ? `(${v.pos})` : '',
          v.example ? `Example: "${v.example}".` : '',
          v.note ? `Note: ${v.note}` : '',
        ];
        try {
          await bridge.socialIngest(sandboxVault, parts.filter(Boolean).join(' '), VOCAB_SPINE);
          if (cancelled) return;
          synced[v.id] = true;
          pushed++;
        } catch (err) {
          console.warn('[Translator] vocab sync failed', err);
        }
      }
      if (pushed > 0 && !cancelled) {
        localStorage.setItem(key, JSON.stringify(synced));
        console.log(`[Translator] ${pushed} word(s) catalogued into ${sandboxVault}`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxVault, vocab]);

  const onTranslated = (sl: string, tl: string, source: string, result: string, meta?: RememberMeta) => {
    remember(sl, tl, source, result, meta);
  };
  const onVocabExtracted = (entries: VocabEntry[]): number => addMany(entries);

  const tabStyle = (id: Tab): React.CSSProperties => ({
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${tab === id ? 'var(--active-border)' : 'transparent'}`,
    color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)',
    padding: '10px 4px',
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  });

  const dueBadge = useMemo(() => {
    const now = Date.now();
    return vocab.filter((v) => v.due <= now).length;
  }, [vocab]);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-void)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', -apple-system, sans-serif",
        fontSize: 13,
      }}
    >
      {/* Tab strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-panel)',
        }}
      >
        <button style={tabStyle('dashboard')} onClick={() => setTab('dashboard')}>
          Dashboard
        </button>
        <button style={tabStyle('files')} onClick={() => setTab('files')}>
          Files
        </button>
        <button style={tabStyle('repertoire')} onClick={() => setTab('repertoire')}>
          Repertoire <Beta />
          {dueBadge > 0 && (
            <span
              style={{
                fontSize: 9,
                background: 'var(--active-bg)',
                border: '1px solid var(--active-border)',
                borderRadius: 8,
                padding: '0 5px',
                color: 'var(--text-primary)',
              }}
            >
              {dueBadge}
            </span>
          )}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: bridge.connected ? 'var(--accent-success-text)' : 'var(--accent-danger-text)',
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {bridge.connected ? 'Bridge OK' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Status line */}
      {(error || success) && (
        <div
          style={{
            padding: '6px 14px',
            fontSize: 11,
            fontWeight: 500,
            background: error ? 'var(--accent-danger-bg)' : 'var(--accent-success-bg)',
            color: error ? 'var(--accent-danger-text)' : 'var(--accent-success-text)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {error ? `⚠ ${error}` : `✓ ${success}`}
        </div>
      )}

      {/* Active surface */}
      {tab === 'dashboard' && (
        <Dashboard
          bridge={bridge}
          model={model}
          history={history}
          sourceLang={sourceLang}
          targetLang={targetLang}
          setSourceLang={setSourceLang}
          setTargetLang={setTargetLang}
          onTranslated={onTranslated}
          onVocabExtracted={onVocabExtracted}
          removeTranslation={removeTranslation}
          clearHistory={clearHistory}
          notify={notify}
        />
      )}
      {tab === 'files' && (
        <FilesTab
          bridge={bridge}
          model={model}
          sourceLang={sourceLang}
          targetLang={targetLang}
          setSourceLang={setSourceLang}
          setTargetLang={setTargetLang}
          forceOcr={forceOcr}
          setForceOcr={setForceOcr}
          onTranslated={onTranslated}
          notify={notify}
        />
      )}
      {tab === 'repertoire' && <RepertoireTab vocab={vocab} grade={grade} remove={remove} />}
    </div>
  );
}
