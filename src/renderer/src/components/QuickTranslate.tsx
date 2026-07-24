/**
 * QuickTranslate — the dashboard's inline translator for fast text jobs
 * (a phrase, a few words, a short paragraph). Documents go through the Files
 * tab instead; this stays instant. Includes the engine toggle and on-demand
 * vocabulary extraction (BETA).
 */
import { useEffect, useRef, useState } from 'react';
import type { TranslatorBridge } from '../hooks/useBridge';
import type { ModelApi } from '../hooks/useModel';
import type { RememberMeta } from '../hooks/useTranslations';
import { LANGUAGES, type VocabEntry } from '../lib/store';
import { buildExtractionPrompt, parseVocabJSON, toEntries } from '../lib/vocab';
import { Beta } from './Beta';
import { ModelPicker } from './ModelPicker';
import { CopyButton } from './CopyButton';
import { actionBtn, iconBtn, primaryBtn, selectStyle, textareaStyle } from '../lib/ui';

export interface QuickPreload {
  source: string;
  result: string;
  fileName?: string;
  ocrUsed?: boolean;
}

interface Props {
  bridge: TranslatorBridge;
  model: ModelApi;
  sourceLang: string;
  targetLang: string;
  setSourceLang: (v: string) => void;
  setTargetLang: (v: string) => void;
  onTranslated: (sourceLang: string, targetLang: string, source: string, result: string, meta?: RememberMeta) => void;
  onVocabExtracted: (entries: VocabEntry[]) => number;
  notify: (msg: string, kind: 'error' | 'success') => void;
  preload: QuickPreload | null;
  onPreloadConsumed: () => void;
}

export function QuickTranslate({
  bridge,
  model,
  sourceLang,
  targetLang,
  setSourceLang,
  setTargetLang,
  onTranslated,
  onVocabExtracted,
  notify,
  preload,
  onPreloadConsumed,
}: Props) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [provenance, setProvenance] = useState<{ fileName?: string; ocrUsed?: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preload) return;
    setSourceText(preload.source);
    setTranslatedText(preload.result);
    setProvenance({ fileName: preload.fileName, ocrUsed: preload.ocrUsed });
    onPreloadConsumed();
  }, [preload, onPreloadConsumed]);

  const editSource = (v: string) => {
    setSourceText(v);
    if (provenance.fileName || provenance.ocrUsed) setProvenance({});
  };

  const handleTranslate = async () => {
    if (!sourceText.trim() || isTranslating) return;
    setIsTranslating(true);
    setTranslatedText('');
    try {
      const result = await bridge.translate(sourceText, sourceLang, targetLang, model.forceMode, model.localModelId);
      setTranslatedText(result);
      if (result.trim()) onTranslated(sourceLang, targetLang, sourceText, result, provenance);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Translation failed', 'error');
    }
    setIsTranslating(false);
  };

  const handleExtract = async () => {
    if (!sourceText.trim() || !translatedText.trim() || isExtracting) return;
    setIsExtracting(true);
    try {
      const { systemPrompt, prompt } = buildExtractionPrompt(sourceText, translatedText, sourceLang, targetLang);
      const raw = await bridge.infer({ systemPrompt, prompt, temperature: 0.1, maxTokens: 2048, forceMode: model.forceMode, localModelId: model.localModelId });
      const entries = toEntries(parseVocabJSON(raw), sourceLang, targetLang, Date.now());
      if (entries.length === 0) {
        notify('No study words found in this translation', 'error');
      } else {
        const added = onVocabExtracted(entries);
        notify(added > 0 ? `${added} word${added > 1 ? 's' : ''} added to your repertoire` : 'Already in your repertoire', 'success');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Extraction failed', 'error');
    }
    setIsExtracting(false);
  };

  const loadTextFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'md' && ext !== 'txt') {
      notify('Quick translate takes .md/.txt — use the Files tab for PDF/DOCX', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setSourceText(ev.target.result as string);
        setProvenance({ fileName: file.name });
        notify(`Loaded ${file.name}`, 'success');
      }
    };
    reader.readAsText(file);
  };

  const handleSwap = () => {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleExport = () => {
    if (!translatedText) return;
    const blob = new Blob([translatedText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translation.md';
    a.click();
    URL.revokeObjectURL(url);
    notify('Downloaded!', 'success');
  };

  const canExtract = !!sourceText.trim() && !!translatedText.trim();

  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        background: 'var(--bg-panel)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <input ref={fileInputRef} type="file" accept=".md,.txt" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) loadTextFile(f); e.target.value = ''; }} />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} style={selectStyle}>
          <option value="auto">Auto-Detect</option>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <button onClick={handleSwap} disabled={sourceLang === 'auto'} style={{ ...iconBtn, opacity: sourceLang === 'auto' ? 0.3 : 1, cursor: sourceLang === 'auto' ? 'not-allowed' : 'pointer' }}>⇄</button>
        <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} style={selectStyle}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <ModelPicker model={model} />
        </div>
      </div>

      {/* Panes */}
      <div style={{ display: 'flex', minHeight: 150 }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) loadTextFile(f); }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-subtle)', background: isDragOver ? 'rgba(128,128,128,0.06)' : 'transparent' }}
        >
          <textarea value={sourceText} onChange={(e) => editSource(e.target.value)} placeholder="Type a phrase, a few words, a short paragraph…" style={{ ...textareaStyle, minHeight: 120 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <textarea value={translatedText} readOnly placeholder="Translation…" style={{ ...textareaStyle, minHeight: 120 }} />
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
        <button onClick={() => fileInputRef.current?.click()} style={actionBtn}>📁 .md/.txt</button>
        {sourceText && <button onClick={() => { editSource(''); setTranslatedText(''); }} style={actionBtn}>Clear</button>}
        {translatedText && (
          <>
            <CopyButton text={translatedText} />
            <button onClick={handleExport} style={actionBtn}>💾 Export</button>
            <button
              onClick={handleExtract}
              disabled={!canExtract || isExtracting}
              style={{ ...actionBtn, display: 'flex', alignItems: 'center', gap: 5, opacity: !canExtract || isExtracting ? 0.5 : 1 }}
            >
              {isExtracting ? '⏳' : '📖'} Vocab <Beta />
            </button>
          </>
        )}
        <button
          onClick={handleTranslate}
          disabled={isTranslating || !sourceText.trim()}
          style={{ ...primaryBtn, marginLeft: 'auto', padding: '7px 20px', cursor: isTranslating || !sourceText.trim() ? 'not-allowed' : 'pointer', opacity: isTranslating || !sourceText.trim() ? 0.5 : 1 }}
        >
          {isTranslating ? '⏳ Translating…' : 'Translate'}
        </button>
      </div>
    </div>
  );
}
