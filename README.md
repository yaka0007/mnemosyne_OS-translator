# Translator

**AI translation that also teaches you the language — a cartridge for [Mnemosyne OS](https://github.com/yaka0007/Mnemosyne-Neural-OS).**

> [!IMPORTANT]
> **Translator is a cartridge — it runs inside Mnemosyne OS.** Install the host app first, then load this cartridge from MnemoHub (or link it in dev mode).
>
> [![Download latest release](https://img.shields.io/badge/⬇%20Download-Mnemosyne%20OS%20latest-0ea5e9?style=for-the-badge)](https://github.com/yaka0007/Mnemosyne-Neural-OS/releases/latest) &nbsp; [![Mnemosyne OS repository](https://img.shields.io/badge/GitHub-Mnemosyne%20OS-181717?style=for-the-badge&logo=github)](https://github.com/yaka0007/Mnemosyne-Neural-OS)

Translate a phrase, a paragraph, or a whole document with **your own AI engine** — local or cloud — so nothing leaves your machine unless you choose a cloud model. Then turn what you just read into vocabulary you actually remember.

<p align="center"><em>Three surfaces — Dashboard · Files · Repertoire — over a hairline, theme-aware UI.</em></p>

---

## What's inside

- 🏠 **Dashboard** — a quick-translate card for fast text jobs, live stats (documents, words, languages used), and a **searchable history** of everything you've translated (typed text and files), reopenable in one click.
- 📄 **Files pipeline** — import **PDF, DOCX, EPUB, TXT or MD**, with optional **OCR** for scanned PDFs. Add several files and translate them in a batch, each with its own progress (reading → OCR → translating → done).
- ⚙️ **Engine picker** — **Auto**, **Cloud**, or a **specific installed local model**, chosen per translation. Preload a local model to check it fits in memory before running a long job.
- 📖 **Repertoire** *(beta)* — extract the useful words from a translation **on demand**, then review them with **spaced-repetition** flashcards (Leitner boxes).
- 🌐 **16 languages** with auto-detect, one-tap swap, drag-and-drop, and Markdown-preserving output.
- 🔒 Every translation is remembered **locally**, and — once you unlock permanence — catalogued into the app's own **sandbox vault** so past work stays recallable, without ever mixing into your other memory.

## How it works

Translator is a sandboxed **cartridge**: it runs in an iframe and talks to the host only through a whitelisted `postMessage` bridge (`src/renderer/src/hooks/useBridge.ts`). It declares exactly the permissions it needs — `vault:read`, `vault:write`, `model:infer`, `dialog:open` — and nothing more.

```
Translator (iframe)                    Mnemosyne OS host
──────────────────                     ─────────────────
model.infer (disableRAG)      ───▶  your local or cloud model  → translation / vocabulary
dialog.selectFile             ───▶  OS file picker
reader.extractDocument        ───▶  pdf-parse / mammoth / OCR  → plain text
model.getInstalled · warmLocal───▶  list + preload local models (engine picker)
vault.sandbox · social.ingest ───▶  remember translations + words in a sandbox vault
```

### Translation you can trust

The source text is sent to the model wrapped in delimiters, with a strict instruction to **translate, never obey** — so a short input that looks like a question or a command is translated literally instead of being answered. Retrieval-augmented memory is disabled for these calls, so nothing from your other vaults can leak into a translation.

### Learning, on demand

Vocabulary extraction is **never automatic** — it runs a second model pass, so it's a button you press when a translation is worth mining. A local model is often enough. Extracted words land in the **Repertoire**, where spaced-repetition schedules each card so you review it right before you'd forget it.

### Choose your engine

Pick **Auto** (let the host route), **Cloud**, or any **installed local model** — per translation. A ⚡ preload button loads the chosen model up front, so a model that's too heavy for your RAM fails **visibly** instead of silently.

> [!NOTE]
> The **local-model list** in the engine picker needs a recent Infinity Edition build. On older hosts the picker simply falls back to **Auto / Cloud / Local (active)** — every other feature works as usual.

## Install

Open **MnemoHub** inside Mnemosyne OS Infinity Edition and install **Translator** — the app downloads this repository and renders it as a cartridge. No manual setup needed.

## Development

```bash
npm install
npm run dev        # vite dev server on http://127.0.0.1:5201
npm run build      # typecheck + production build into dist/
```

The cartridge is a plain Vite + React app. Inside Mnemosyne OS it is served through the `mnemo-plugin://` protocol from the committed `dist/` build, so **always run `npm run build` and commit `dist/` before pushing** — the pushed default branch is exactly what users install and update to.

## Cartridge manifest

[`mnemo-plugin.json`](mnemo-plugin.json) declares the cartridge — entrypoint, widget, and the permissions it requests:

| Permission | Why |
|------------|-----|
| `model:infer` | run translation and vocabulary extraction on your chosen engine |
| `dialog:open` | pick documents to import (PDF/DOCX/EPUB/TXT/MD) |
| `vault:write` | keep translations and learned words in the app's own sandbox vault |
| `vault:read` | read that sandbox back |

See the [Mnemosyne OS handbook](https://github.com/yaka0007/Mnemosyne-Neural-OS) for the cartridge SDK.

## License

[MIT](LICENSE)
