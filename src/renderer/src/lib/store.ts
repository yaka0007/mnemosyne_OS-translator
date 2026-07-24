/**
 * store.ts — Local persistence + domain model for the Translator cartridge.
 *
 * The cartridge keeps two local stores in localStorage (its source of truth):
 *   - translation history  (translator_history_v1)
 *   - vocabulary repertoire (translator_vocab_v1) — includes spaced-repetition state
 *
 * Both are best-effort mirrored into the app's sandbox vault (doc 58) so past
 * work becomes recallable, but the SRS scheduling lives here because it mutates
 * over time and does not belong in immutable vault chronicles.
 */

export interface LanguageOption {
  code: string;
  name: string;
}

/** Supported language pairs — kept in sync with the host translate prompt. */
export const LANGUAGES: LanguageOption[] = [
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

/** English label for a language code (falls back to the code itself). */
export function langName(code: string): string {
  if (code === 'auto') return 'Auto';
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

/** One remembered translation — the app's persisted "translation memory". */
export interface TranslationRecord {
  id: string;
  sourceLang: string;
  targetLang: string;
  source: string;
  result: string;
  at: number;
  /** Original file name when the source came from an imported document. */
  fileName?: string;
  /** True when the imported document's text was recovered via OCR. */
  ocrUsed?: boolean;
}

/**
 * One learned word/expression in the repertoire, with Leitner review state.
 * `sourceTerm`/`targetTerm` are stored in the translation's source/target
 * languages respectively; the "language being learned" is whichever is foreign
 * to the user — the UI shows both and lets the learner pick a review direction.
 */
export interface VocabEntry {
  id: string;
  sourceLang: string;
  targetLang: string;
  sourceTerm: string;
  targetTerm: string;
  pos?: string;
  example?: string;
  exampleTranslation?: string;
  note?: string;
  at: number;
  // ── Spaced-repetition (Leitner) state ──
  box: number; // 0..5 — higher box = longer interval
  due: number; // epoch ms when this card is next due
  reviews: number;
  lapses: number;
}

export const HISTORY_KEY = 'translator_history_v1';
export const VOCAB_KEY = 'translator_vocab_v1';

/** Stable DJB2 hash — record id + per-vault idempotency key. */
export function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — the in-memory state stays authoritative for the session */
  }
}

// ── Spaced repetition ─────────────────────────────────────────────────────────

/** Leitner intervals per box, in ms. Box 0 = just failed / brand new. */
export const LEITNER_INTERVALS_MS: number[] = [
  10 * 60_000, //  0 → 10 min
  24 * 3_600_000, //  1 → 1 day
  3 * 24 * 3_600_000, //  2 → 3 days
  7 * 24 * 3_600_000, //  3 → 7 days
  14 * 24 * 3_600_000, //  4 → 14 days
  30 * 24 * 3_600_000, //  5 → 30 days
];
export const MAX_BOX = LEITNER_INTERVALS_MS.length - 1;

/** Fresh SRS fields for a new card (due immediately). */
export function freshSrs(now: number): Pick<VocabEntry, 'box' | 'due' | 'reviews' | 'lapses'> {
  return { box: 0, due: now, reviews: 0, lapses: 0 };
}

/** Grade a card and return the next scheduling patch. */
export function scheduleNext(
  entry: VocabEntry,
  remembered: boolean,
  now: number,
): Pick<VocabEntry, 'box' | 'due' | 'reviews' | 'lapses'> {
  const box = remembered ? Math.min(entry.box + 1, MAX_BOX) : 0;
  const interval = LEITNER_INTERVALS_MS[box] ?? 10 * 60_000;
  return {
    box,
    due: now + interval,
    reviews: entry.reviews + 1,
    lapses: entry.lapses + (remembered ? 0 : 1),
  };
}

/** Cards due for review at `now`, oldest-due first. */
export function dueEntries(list: VocabEntry[], now: number): VocabEntry[] {
  return list.filter((e) => e.due <= now).sort((a, b) => a.due - b.due);
}
