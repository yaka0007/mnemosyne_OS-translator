import { useState, useRef, useEffect } from 'react';
import { useTranslatorBridge } from './hooks/useBridge';

interface LanguageOption { code: string; name: string; }

const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'nl', name: 'Dutch (Nederlands)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
];

export default function App() {
  const bridge = useTranslatorBridge();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('fr');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inherit theme from parent
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'MNEMO_THEME_SYNC') {
        document.documentElement.setAttribute('data-theme', e.data.theme);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim() || isTranslating) return;
    setIsTranslating(true);
    setTranslatedText('');
    setError(null);
    try {
      const result = await bridge.translate(sourceText, sourceLang, targetLang);
      setTranslatedText(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    }
    setIsTranslating(false);
  };

  const handleImportFile = () => fileInputRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setSourceText(ev.target.result as string);
        setSuccess(`Loaded ${file.name}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    if (!translatedText) return;
    const blob = new Blob([translatedText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'translated_document.md'; a.click();
    URL.revokeObjectURL(url);
    setSuccess('Downloaded!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'md' || ext === 'txt') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSourceText(ev.target.result as string);
          setSuccess(`Loaded ${file.name}`);
          setTimeout(() => setSuccess(null), 3000);
        }
      };
      reader.readAsText(file);
    } else {
      setError('Only .md and .txt files supported');
      setTimeout(() => setError(null), 4000);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const counts = (text: string) => {
    const c = text.length;
    const w = text.trim() ? text.trim().split(/\s+/).length : 0;
    return `${c} chars · ${w} words`;
  };

  return (
    <div style={{
      width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-void)', color: 'var(--text-primary)',
      fontFamily: "'Inter', -apple-system, sans-serif", fontSize: '13px',
    }}>
      <input ref={fileInputRef} type="file" accept=".md,.txt" style={{ display: 'none' }} onChange={handleFileSelected} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-panel)', flexWrap: 'wrap',
      }}>
        <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} style={selectStyle}>
          <option value="auto">Auto-Detect</option>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>

        <button onClick={handleSwap} disabled={sourceLang === 'auto'} style={{
          ...iconBtn, opacity: sourceLang === 'auto' ? 0.3 : 1,
          cursor: sourceLang === 'auto' ? 'not-allowed' : 'pointer',
        }}>⇄</button>

        <select value={targetLang} onChange={e => setTargetLang(e.target.value)} style={selectStyle}>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: bridge.connected ? 'var(--accent-success-text)' : 'var(--accent-danger-text)',
          }} />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {bridge.connected ? 'Bridge OK' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Status */}
      {(error || success) && (
        <div style={{
          padding: '6px 14px', fontSize: '11px', fontWeight: 500,
          background: error ? 'var(--accent-danger-bg)' : 'var(--accent-success-bg)',
          color: error ? 'var(--accent-danger-text)' : 'var(--accent-success-text)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {error ? `⚠ ${error}` : `✓ ${success}`}
        </div>
      )}

      {/* Split panels */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Source */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            borderRight: '1px solid var(--border-subtle)', position: 'relative',
            background: isDragOver ? 'rgba(255,255,255,0.02)' : 'transparent',
          }}
        >
          {isDragOver && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <div style={{
                border: '2px dashed var(--border-active)', borderRadius: 12,
                padding: 30, textAlign: 'center', color: 'var(--text-primary)',
              }}>
                <div style={{ fontSize: 24 }}>📥</div>
                <div>Drop file here</div>
              </div>
            </div>
          )}
          <textarea
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            placeholder="Type or paste text, or drag a .md/.txt file..."
            style={textareaStyle}
          />
          <div style={barStyle}>
            <button onClick={handleImportFile} style={actionBtn}>📁 Import</button>
            {sourceText && <button onClick={() => setSourceText('')} style={{ ...actionBtn, marginLeft: 6 }}>Clear</button>}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{counts(sourceText)}</span>
          </div>
        </div>

        {/* Target */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <textarea value={translatedText} readOnly placeholder="Translation will appear here..." style={textareaStyle} />
          <div style={barStyle}>
            {translatedText && (
              <>
                <button onClick={() => copy(translatedText)} style={actionBtn}>📋 Copy</button>
                <button onClick={handleExport} style={{ ...actionBtn, marginLeft: 6 }}>💾 Export</button>
              </>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{counts(translatedText)}</span>
          </div>
        </div>
      </div>

      {/* Translate button */}
      <div style={{
        padding: '12px 14px', borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-panel)', display: 'flex', justifyContent: 'flex-end',
      }}>
        <button onClick={handleTranslate} disabled={isTranslating || !sourceText.trim()} style={{
          background: 'var(--active-bg)', border: '1px solid var(--active-border)',
          borderRadius: 8, color: 'var(--text-primary)', padding: '8px 24px',
          fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          cursor: (isTranslating || !sourceText.trim()) ? 'not-allowed' : 'pointer',
          opacity: (isTranslating || !sourceText.trim()) ? 0.5 : 1,
        }}>
          {isTranslating ? '⏳ Translating...' : 'Translate'}
        </button>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border-subtle)',
  borderRadius: 6, color: 'var(--text-primary)',
  padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
};

const iconBtn: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border-subtle)',
  borderRadius: 6, color: 'var(--text-primary)',
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', resize: 'none',
  padding: 14, color: 'var(--text-primary)', fontFamily: 'inherit',
  fontSize: 13, lineHeight: 1.6, outline: 'none', overflowY: 'auto',
};

const barStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '6px 12px',
  background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)',
};

const actionBtn: React.CSSProperties = {
  background: 'var(--card-bg)', border: '1px solid var(--border-subtle)',
  borderRadius: 4, color: 'var(--text-secondary)', padding: '3px 8px',
  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
};
