# Mnemosyne OS — Translator

A translation workspace that also helps you learn the language — a cartridge for
[Mnemosyne OS](https://github.com/yaka0007/Mnemosyne-Neural-OS). Uses your own AI
engine (local or cloud), so nothing leaves your machine unless you choose a cloud model.

Open source (MIT).

## What's inside

- **Dashboard** — quick translate for a phrase or a short paragraph, with live stats
  (documents, words, languages) and a searchable history of everything you've translated.
- **Files** — a document pipeline for PDF, DOCX, EPUB, TXT and MD, with optional **OCR**
  for scanned PDFs. Queue several files and translate them in a batch.
- **Engine picker** — Auto, Cloud, or a **specific installed local model**, chosen per
  translation. Preload a local model to check it loads before running a long job.
- **Repertoire (beta)** — extract the useful words from a translation on demand, then
  review them with spaced-repetition flashcards.

16 languages. Every translation is remembered locally, and — once you unlock permanence —
catalogued into your Mnemosyne vault so past work stays recallable.

## Install

Open **MnemoHub** inside Mnemosyne OS Infinity Edition and install **Translator** — the app
downloads this repository and renders it as a cartridge. No manual setup needed.

## Development

```bash
npm install
npm run dev        # vite dev server on http://127.0.0.1:5201
npm run build      # typecheck + production build into dist/
```

The cartridge is a plain Vite + React app. Inside Mnemosyne OS it is served through the
`mnemo-plugin://` protocol from the committed `dist/` build, so **always run `npm run build`
and commit `dist/` before pushing** — the pushed default branch is exactly what users
install and update to.

## Cartridge manifest

[`mnemo-plugin.json`](mnemo-plugin.json) declares the cartridge: entrypoint, widgets, and the
permissions it requests — `vault:read`, `vault:write` (its own sandbox vault), `model:infer`
(translation + vocabulary), and `dialog:open` (importing documents). See the
[Mnemosyne OS handbook](https://github.com/yaka0007/Mnemosyne-Neural-OS) for the cartridge SDK.

## License

[MIT](LICENSE)
