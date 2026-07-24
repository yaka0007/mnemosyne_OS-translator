/**
 * FilesTab — the document-translation pipeline, kept separate from quick text
 * because it is a multi-stage process: a PDF may need OCR (slow), whereas a
 * .md/.txt is near-instant. Files are added to a queue (the host picker is
 * single-file, so "multiple" = add several), then each is extracted → translated
 * sequentially, with a visible per-file status, and recorded into history.
 */
import { useCallback, useRef, useState } from 'react';
import type { TranslatorBridge } from '../hooks/useBridge';
import type { ModelApi } from '../hooks/useModel';
import type { RememberMeta } from '../hooks/useTranslations';
import { hashString, LANGUAGES, langName } from '../lib/store';
import { ModelPicker } from './ModelPicker';
import { CopyButton } from './CopyButton';
import { InfinityLoader } from './InfinityLoader';
import { actionBtn, cardStyle, primaryBtn, selectStyle } from '../lib/ui';

type JobStatus = 'queued' | 'extracting' | 'translating' | 'done' | 'error';

interface FileJob {
  id: string;
  path: string;
  name: string;
  status: JobStatus;
  ocrUsed: boolean;
  truncated: boolean;
  error?: string;
  result?: string;
  sourceLang: string;
  targetLang: string;
}

const DOC_FILTERS = [{ name: 'Documents', extensions: ['pdf', 'docx', 'epub', 'txt', 'md'] }];

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: 'Queued',
  extracting: 'Reading / OCR…',
  translating: 'Translating…',
  done: 'Done',
  error: 'Error',
};

interface Props {
  bridge: TranslatorBridge;
  model: ModelApi;
  sourceLang: string;
  targetLang: string;
  setSourceLang: (v: string) => void;
  setTargetLang: (v: string) => void;
  forceOcr: boolean;
  setForceOcr: (v: boolean) => void;
  onTranslated: (sl: string, tl: string, source: string, result: string, meta?: RememberMeta) => void;
  notify: (msg: string, kind: 'error' | 'success') => void;
}

export function FilesTab({
  bridge,
  model,
  sourceLang,
  targetLang,
  setSourceLang,
  setTargetLang,
  forceOcr,
  setForceOcr,
  onTranslated,
  notify,
}: Props) {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [processing, setProcessing] = useState(false);
  const jobsRef = useRef<FileJob[]>([]);

  const commit = useCallback((next: FileJob[]) => {
    jobsRef.current = next;
    setJobs(next);
  }, []);
  const patch = useCallback(
    (id: string, p: Partial<FileJob>) => commit(jobsRef.current.map((j) => (j.id === id ? { ...j, ...p } : j))),
    [commit],
  );

  const addFile = async () => {
    try {
      const path = await bridge.pickFile(DOC_FILTERS);
      if (!path) return;
      const name = path.split(/[\\/]/).pop() || 'document';
      const id = hashString(`${path}|${sourceLang}|${targetLang}`);
      if (jobsRef.current.some((j) => j.id === id)) {
        notify('That file is already in the queue', 'error');
        return;
      }
      commit([
        ...jobsRef.current,
        { id, path, name, status: 'queued', ocrUsed: false, truncated: false, sourceLang, targetLang },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add file';
      // The document picker needs dialog:open — a fresh manifest permission the
      // host only sees after the cartridge is reloaded. Guide instead of dumping raw.
      if (/Unauthorized|dialog:open/i.test(msg)) {
        notify('Importing files needs the "dialog:open" permission — reload the cartridge (restart the app), then approve it.', 'error');
      } else {
        notify(msg, 'error');
      }
    }
  };

  const processJob = async (job: FileJob) => {
    try {
      patch(job.id, { status: 'extracting', error: undefined });
      const doc = await bridge.extractDocument(job.path, forceOcr);
      if (!doc.text.trim()) throw new Error('No text extracted (try the OCR option)');
      patch(job.id, { status: 'translating', ocrUsed: doc.ocrUsed, truncated: doc.truncated });
      const result = await bridge.translate(doc.text, job.sourceLang, job.targetLang, model.forceMode, model.localModelId);
      patch(job.id, { status: 'done', result });
      onTranslated(job.sourceLang, job.targetLang, doc.text, result, {
        fileName: doc.name || job.name,
        ocrUsed: doc.ocrUsed,
      });
    } catch (err) {
      patch(job.id, { status: 'error', error: err instanceof Error ? err.message : 'Failed' });
    }
  };

  const runAll = async () => {
    if (processing) return;
    setProcessing(true);
    // Sequential: the host serializes inference anyway, and OCR is heavy.
    for (const job of jobsRef.current) {
      if (job.status === 'queued' || job.status === 'error') {
        // Re-read the latest copy in case langs changed.
        const cur = jobsRef.current.find((j) => j.id === job.id);
        if (cur) await processJob(cur);
      }
    }
    setProcessing(false);
    notify('Queue processed', 'success');
  };

  const exportJob = (job: FileJob) => {
    if (!job.result) return;
    const blob = new Blob([job.result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = job.name.replace(/\.[^.]+$/, '') + `_${job.targetLang}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pending = jobs.some((j) => j.status === 'queued' || j.status === 'error');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-panel)', flexWrap: 'wrap' }}>
        <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} style={selectStyle}>
          <option value="auto">Auto-Detect</option>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <span style={{ color: 'var(--text-muted)' }}>→</span>
        <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} style={selectStyle}>
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <label style={optLabel} title="Run OCR on scanned PDFs / images">
          <input type="checkbox" checked={forceOcr} onChange={(e) => setForceOcr(e.target.checked)} /> OCR
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ModelPicker model={model} compact />
          <button onClick={addFile} style={actionBtn} title="Add a PDF, DOCX, EPUB, TXT or MD file">➕ Add file</button>
          <button
            onClick={runAll}
            disabled={processing || !pending}
            style={{ ...primaryBtn, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8, opacity: processing || !pending ? 0.6 : 1, cursor: processing || !pending ? 'not-allowed' : 'pointer' }}
          >
            {processing ? (
              <>
                <InfinityLoader size={14} title="Working…" /> Working…
              </>
            ) : (
              'Translate all'
            )}
          </button>
        </div>
      </div>

      {/* Queue */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {jobs.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32 }}>📄</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Translate documents</div>
            <div style={{ fontSize: 12, maxWidth: 340 }}>
              Add PDF, DOCX, EPUB, TXT or MD files. Scanned PDFs use OCR (slower); .md is near-instant.
              Add several to translate them in a batch.
            </div>
            <button onClick={addFile} style={{ ...actionBtn, marginTop: 4 }}>➕ Add file</button>
          </div>
        ) : (
          <>
            {jobs.map((job) => (
              <div key={job.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.name}>
                    📎 {job.name}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {langName(job.sourceLang)} → {langName(job.targetLang)}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 10,
                      fontWeight: 500,
                      color:
                        job.status === 'error'
                          ? 'var(--accent-danger-text)'
                          : job.status === 'done'
                            ? 'var(--accent-success-text)'
                            : 'var(--text-muted)',
                    }}
                  >
                    {(job.status === 'extracting' || job.status === 'translating') && (
                      <InfinityLoader size={14} title={STATUS_LABEL[job.status]} />
                    )}
                    {job.status === 'done' && job.ocrUsed ? 'Done · OCR' : STATUS_LABEL[job.status]}
                    {job.status === 'done' && job.truncated ? ' · truncated' : ''}
                  </span>
                </div>

                {job.status === 'error' && job.error && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--accent-danger-text)' }}>⚠ {job.error}</div>
                )}
                {job.status === 'done' && job.result && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {job.result.slice(0, 160)}{job.result.length > 160 ? '…' : ''}
                  </div>
                )}

                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  {job.status === 'done' && job.result && (
                    <>
                      <CopyButton text={job.result} />
                      <button onClick={() => exportJob(job)} style={actionBtn}>💾 Export</button>
                    </>
                  )}
                  {(job.status === 'queued' || job.status === 'error') && !processing && (
                    <button onClick={() => processJob(job)} style={actionBtn}>
                      {job.status === 'error' ? '↻ Retry' : '▶ Translate'}
                    </button>
                  )}
                  <button
                    onClick={() => commit(jobsRef.current.filter((j) => j.id !== job.id))}
                    disabled={job.status === 'extracting' || job.status === 'translating'}
                    style={{ ...actionBtn, marginLeft: 'auto', color: 'var(--text-muted)', opacity: job.status === 'extracting' || job.status === 'translating' ? 0.4 : 1 }}
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {jobs.some((j) => j.status === 'done') && (
              <button onClick={() => commit(jobsRef.current.filter((j) => j.status !== 'done'))} style={{ ...actionBtn, alignSelf: 'flex-start' }}>
                Clear finished
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const optLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 10,
  color: 'var(--text-muted)',
  cursor: 'pointer',
  userSelect: 'none',
};
