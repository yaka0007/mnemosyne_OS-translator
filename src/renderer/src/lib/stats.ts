/** stats.ts — dashboard metrics derived from the translation history. */
import { type TranslationRecord } from './store';

export interface TranslatorStats {
  /** Total translations made. */
  total: number;
  /** Translations that came from an imported document. */
  files: number;
  /** Total words across all translated source texts. */
  words: number;
  /** Distinct languages involved (source + target, excluding "auto"). */
  languages: number;
  /** How many used OCR. */
  ocr: number;
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function computeStats(history: TranslationRecord[]): TranslatorStats {
  const langs = new Set<string>();
  let files = 0;
  let words = 0;
  let ocr = 0;
  for (const r of history) {
    if (r.fileName) files++;
    if (r.ocrUsed) ocr++;
    words += wordCount(r.source);
    if (r.sourceLang && r.sourceLang !== 'auto') langs.add(r.sourceLang);
    if (r.targetLang && r.targetLang !== 'auto') langs.add(r.targetLang);
  }
  return { total: history.length, files, words, languages: langs.size, ocr };
}

/** Compact number formatting for the stat tiles (1.2k, 3.4M). */
export function fmtNum(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
