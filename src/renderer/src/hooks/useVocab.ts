/** useVocab — persisted vocabulary repertoire with spaced-repetition state. */
import { useCallback, useRef, useState } from 'react';
import {
  VOCAB_KEY,
  loadJSON,
  saveJSON,
  scheduleNext,
  type VocabEntry,
} from '../lib/store';

export interface VocabApi {
  vocab: VocabEntry[];
  /** Merge freshly extracted entries; existing ids keep their SRS progress. Returns how many were new. */
  addMany: (entries: VocabEntry[]) => number;
  /** Grade a card in the review flow and reschedule it. */
  grade: (id: string, remembered: boolean) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export function useVocab(): VocabApi {
  const [vocab, setVocab] = useState<VocabEntry[]>(() => loadJSON<VocabEntry[]>(VOCAB_KEY, []));
  // Mirror keeps a synchronous view so addMany can return an accurate new-count
  // and every writer starts from the latest list even within one render.
  const ref = useRef<VocabEntry[]>(vocab);

  const commit = useCallback((next: VocabEntry[]) => {
    ref.current = next;
    saveJSON(VOCAB_KEY, next);
    setVocab(next);
  }, []);

  const addMany = useCallback(
    (entries: VocabEntry[]): number => {
      if (entries.length === 0) return 0;
      const byId = new Map(ref.current.map((e) => [e.id, e]));
      let added = 0;
      for (const e of entries) {
        if (byId.has(e.id)) continue; // keep existing card + its review progress
        byId.set(e.id, e);
        added++;
      }
      if (added > 0) commit(Array.from(byId.values()));
      return added;
    },
    [commit],
  );

  const grade = useCallback(
    (id: string, remembered: boolean) => {
      const now = Date.now();
      commit(ref.current.map((e) => (e.id === id ? { ...e, ...scheduleNext(e, remembered, now) } : e)));
    },
    [commit],
  );

  const remove = useCallback(
    (id: string) => commit(ref.current.filter((e) => e.id !== id)),
    [commit],
  );

  const clear = useCallback(() => commit([]), [commit]);

  return { vocab, addMany, grade, remove, clear };
}
