/** useTranslations — persisted translation history (source of truth: localStorage). */
import { useCallback, useRef, useState } from 'react';
import { HISTORY_KEY, loadJSON, saveJSON, hashString, type TranslationRecord } from '../lib/store';

export interface RememberMeta {
  fileName?: string;
  ocrUsed?: boolean;
}

export interface TranslationsApi {
  history: TranslationRecord[];
  remember: (
    sourceLang: string,
    targetLang: string,
    source: string,
    result: string,
    meta?: RememberMeta,
  ) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export function useTranslations(): TranslationsApi {
  const [history, setHistory] = useState<TranslationRecord[]>(() =>
    loadJSON<TranslationRecord[]>(HISTORY_KEY, []),
  );
  const ref = useRef<TranslationRecord[]>(history);

  const commit = useCallback((next: TranslationRecord[]) => {
    ref.current = next;
    saveJSON(HISTORY_KEY, next);
    setHistory(next);
  }, []);

  const remember = useCallback(
    (sourceLang: string, targetLang: string, source: string, result: string, meta?: RememberMeta) => {
      if (!result.trim()) return;
      const rec: TranslationRecord = {
        id: hashString(`${sourceLang}|${targetLang}|${source}`),
        sourceLang,
        targetLang,
        source,
        result,
        at: Date.now(),
        ...(meta?.fileName ? { fileName: meta.fileName } : {}),
        ...(meta?.ocrUsed ? { ocrUsed: true } : {}),
      };
      // Newest first; a re-translation of the same input refreshes its record.
      const next = [rec, ...ref.current.filter((r) => r.id !== rec.id)].slice(0, 500);
      commit(next);
    },
    [commit],
  );

  const remove = useCallback((id: string) => commit(ref.current.filter((r) => r.id !== id)), [commit]);

  const clear = useCallback(() => commit([]), [commit]);

  return { history, remember, remove, clear };
}
