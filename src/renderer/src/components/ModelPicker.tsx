/**
 * ModelPicker — choose the translation engine: Auto, Cloud, or a specific
 * installed local model. When a local model is picked, a ⚡ button preloads it
 * so a load failure (e.g. too heavy for available RAM) surfaces immediately
 * instead of silently — the failure mode Tony reported with DeepSeek.
 */
import type { ModelApi } from '../hooks/useModel';
import { InfinityLoader } from './InfinityLoader';
import { selectStyle } from '../lib/ui';

function gb(bytes: number): string {
  return bytes > 0 ? `${(bytes / 1e9).toFixed(1)} GB` : '';
}

export function ModelPicker({ model, compact }: { model: ModelApi; compact?: boolean }) {
  const { installed, config, choice, setChoice } = model;
  const cloudName = config?.cloud?.model || config?.cloud?.provider || 'cloud';
  const isLocal = choice === 'local' || choice.startsWith('local:');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        style={{ ...selectStyle, maxWidth: 220 }}
        title="Translation engine"
      >
        <option value="auto">⚙ Auto (app default)</option>
        <option value="cloud">☁ Cloud · {cloudName}</option>
        {installed.length > 0 ? (
          <optgroup label="Local models">
            {installed.map((m) => (
              <option key={m.id} value={`local:${m.id}`}>
                💻 {m.label}
                {gb(m.sizeBytes) ? ` · ${gb(m.sizeBytes)}` : ''}
              </option>
            ))}
          </optgroup>
        ) : (
          <option value="local">💻 Local (active)</option>
        )}
      </select>

      {isLocal && (
        <button
          onClick={model.preload}
          disabled={model.warmState === 'loading'}
          title={
            model.warmState === 'error'
              ? model.warmError ?? 'Load failed'
              : model.warmState === 'ready'
                ? 'Model loaded and ready'
                : 'Preload this model to test it loads'
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--card-bg)',
            border: `1px solid ${
              model.warmState === 'error'
                ? 'var(--accent-danger-text)'
                : model.warmState === 'ready'
                  ? 'var(--accent-success-text)'
                  : 'var(--border-subtle)'
            }`,
            borderRadius: 6,
            color:
              model.warmState === 'error'
                ? 'var(--accent-danger-text)'
                : model.warmState === 'ready'
                  ? 'var(--accent-success-text)'
                  : 'var(--text-secondary)',
            padding: '3px 8px',
            fontSize: 11,
            fontFamily: 'inherit',
            cursor: model.warmState === 'loading' ? 'wait' : 'pointer',
          }}
        >
          {model.warmState === 'loading' ? (
            <>
              <InfinityLoader size={12} title="Loading model" /> Loading…
            </>
          ) : model.warmState === 'ready' ? (
            '✓ Ready'
          ) : model.warmState === 'error' ? (
            '⚠ Load failed'
          ) : (
            '⚡ Preload'
          )}
        </button>
      )}

      {!compact && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }} title="Engine that will run">
          {model.activeLabel}
        </span>
      )}

      {isLocal && model.warmState === 'error' && model.warmError && (
        <span style={{ fontSize: 10, color: 'var(--accent-danger-text)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={model.warmError}>
          {model.warmError}
        </span>
      )}
    </div>
  );
}
