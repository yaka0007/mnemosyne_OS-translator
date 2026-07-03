# Mnemosyne OS — Translator

Batch-translate text and Markdown files using your own AI API — a cartridge for [Mnemosyne OS](https://github.com/yaka0007/Mnemosyne-Neural-OS). 16 languages, streaming inference, file import/export.

Open source (MIT).

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

[`mnemo-plugin.json`](mnemo-plugin.json) declares the cartridge: entrypoint, widgets, and the permissions it requests (`vault:read`, `model:infer`). See the [Mnemosyne OS handbook](https://github.com/yaka0007/Mnemosyne-Neural-OS) for the cartridge SDK.

## License

[MIT](LICENSE)
