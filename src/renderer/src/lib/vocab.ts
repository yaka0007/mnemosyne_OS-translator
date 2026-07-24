/**
 * vocab.ts — On-demand vocabulary extraction (BETA).
 *
 * Given a completed translation, we ask the model to surface the words and
 * expressions a learner should memorize, as a strict JSON array. Extraction is
 * NEVER automatic: it runs only when the user presses the button, because it is
 * a second inference pass and therefore has a cost. A local model may suffice.
 */
import { hashString, langName, type VocabEntry, freshSrs } from './store';

/** The raw shape we ask the model to emit (before we attach ids + SRS state). */
export interface RawVocab {
  sourceTerm: string;
  targetTerm: string;
  pos?: string;
  example?: string;
  exampleTranslation?: string;
  note?: string;
}

/** Build the system + user prompt for a strict JSON extraction. */
export function buildExtractionPrompt(
  source: string,
  result: string,
  sourceLang: string,
  targetLang: string,
): { systemPrompt: string; prompt: string } {
  const srcName = langName(sourceLang);
  const tgtName = langName(targetLang);
  const systemPrompt = `You are a language-learning assistant building a study glossary.
From a ${srcName}→${tgtName} translation, extract the most USEFUL words and
expressions a learner should memorize (idioms, less-common vocabulary, key verbs
and nouns — skip trivial function words like "the", "and", "is").

Return ONLY a JSON array (no prose, no code fences) of at most 20 objects:
[{"sourceTerm": "...", "targetTerm": "...", "pos": "noun|verb|adj|adv|phrase|...",
  "example": "a short sentence in ${srcName}", "exampleTranslation": "its ${tgtName} translation",
  "note": "optional usage nuance"}]

Rules:
- "sourceTerm" is in ${srcName}; "targetTerm" is its ${tgtName} meaning.
- Use the lemma/base form where natural (infinitive verbs, singular nouns).
- If nothing is worth learning, return [].`;
  const prompt = `SOURCE (${srcName}):\n${source.slice(0, 4000)}\n\nTRANSLATION (${tgtName}):\n${result.slice(0, 4000)}`;
  return { systemPrompt, prompt };
}

/**
 * Robustly pull a JSON array out of a model reply that may include code fences
 * or stray prose. Returns [] on any parse failure rather than throwing.
 */
export function parseVocabJSON(text: string): RawVocab[] {
  if (!text) return [];
  // Prefer a fenced block if present, else the first bracketed array.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1] ?? text;
  const start = body.indexOf('[');
  const end = body.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: RawVocab[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const sourceTerm = typeof o.sourceTerm === 'string' ? o.sourceTerm.trim() : '';
    const targetTerm = typeof o.targetTerm === 'string' ? o.targetTerm.trim() : '';
    if (!sourceTerm || !targetTerm) continue;
    out.push({
      sourceTerm,
      targetTerm,
      pos: typeof o.pos === 'string' ? o.pos.trim() : undefined,
      example: typeof o.example === 'string' ? o.example.trim() : undefined,
      exampleTranslation:
        typeof o.exampleTranslation === 'string' ? o.exampleTranslation.trim() : undefined,
      note: typeof o.note === 'string' ? o.note.trim() : undefined,
    });
    if (out.length >= 30) break; // hard cap regardless of model output
  }
  return out;
}

/** Attach a stable id + fresh SRS state, keyed by the language pair + source term. */
export function toEntries(
  raws: RawVocab[],
  sourceLang: string,
  targetLang: string,
  now: number,
): VocabEntry[] {
  return raws.map((r) => ({
    id: hashString(`${sourceLang}|${targetLang}|${r.sourceTerm.toLowerCase()}`),
    sourceLang,
    targetLang,
    sourceTerm: r.sourceTerm,
    targetTerm: r.targetTerm,
    pos: r.pos,
    example: r.example,
    exampleTranslation: r.exampleTranslation,
    note: r.note,
    at: now,
    ...freshSrs(now),
  }));
}
