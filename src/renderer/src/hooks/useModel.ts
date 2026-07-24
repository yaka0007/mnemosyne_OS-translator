/**
 * useModel — the engine picker.
 *
 * Choice is one of:
 *   'auto'            → let the app's own routing decide
 *   'cloud'           → force the configured cloud engine
 *   'local'           → force the configured active local model
 *   'local:<id>'      → force a SPECIFIC installed local model
 *
 * Local/Cloud/specific-model are applied per call via the host `forceMode` +
 * `localModelId` (no host routing change). The picker lists the actually
 * installed local models and can preload one to surface a load failure early
 * (e.g. a model too heavy for the available RAM) instead of failing silently.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ForceMode,
  LocalModelInfo,
  ModelConfig,
  ModelStatus,
  TranslatorBridge,
} from './useBridge';

const CHOICE_KEY = 'translator_engine_v2';

function loadChoice(): string {
  try {
    return localStorage.getItem(CHOICE_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export type WarmState = 'idle' | 'loading' | 'ready' | 'error';

export interface ModelApi {
  /** 'auto' | 'cloud' | 'local' | 'local:<id>' */
  choice: string;
  setChoice: (c: string) => void;
  forceMode: ForceMode | undefined;
  localModelId: string | undefined;
  installed: LocalModelInfo[];
  config: ModelConfig | null;
  status: ModelStatus | null;
  /** Human label of the engine that will run, e.g. "Local · Qwen2 7B". */
  activeLabel: string;
  /** Preload the chosen local model to test it; result lands in warmState/warmError. */
  preload: () => void;
  warmState: WarmState;
  warmError: string | null;
  refresh: () => void;
}

export function useModel(bridge: TranslatorBridge): ModelApi {
  const [choice, setChoiceState] = useState<string>(loadChoice);
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [installed, setInstalled] = useState<LocalModelInfo[]>([]);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [warmState, setWarmState] = useState<WarmState>('idle');
  const [warmError, setWarmError] = useState<string | null>(null);
  const warmSeq = useRef(0);

  const refresh = useCallback(() => {
    if (!bridge.connected) return;
    bridge.getModelConfig().then(setConfig).catch(() => setConfig(null));
    bridge.getModelStatus().then(setStatus).catch(() => setStatus(null));
    bridge.getInstalledModels().then(setInstalled).catch(() => setInstalled([]));
  }, [bridge]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setChoice = useCallback((c: string) => {
    setChoiceState(c);
    setWarmState('idle');
    setWarmError(null);
    try {
      localStorage.setItem(CHOICE_KEY, c);
    } catch {
      /* ignore quota */
    }
  }, []);

  const isLocal = choice === 'local' || choice.startsWith('local:');
  const forceMode: ForceMode | undefined = choice === 'auto' ? undefined : isLocal ? 'local' : 'cloud';
  const localModelId: string | undefined = choice.startsWith('local:') ? choice.slice('local:'.length) : undefined;

  // Which engine actually runs, and its model name for display.
  const effectiveCloud = choice === 'cloud' || (choice === 'auto' && config?.mode === 'cloud');
  const localName =
    (localModelId && (installed.find((m) => m.id === localModelId)?.label || localModelId)) ||
    config?.local?.activeModel ||
    'local model';
  const cloudName = config?.cloud?.model || config?.cloud?.provider || 'cloud model';
  const prefix = choice === 'auto' ? 'Auto' : effectiveCloud ? 'Cloud' : 'Local';
  const modelName = effectiveCloud ? cloudName : localName;
  const activeLabel = config ? `${prefix} · ${modelName}` : prefix;

  const preload = useCallback(() => {
    // Preload the specific chosen model, or the configured active one.
    const id = localModelId ?? config?.local?.activeModel;
    if (!id) {
      setWarmState('error');
      setWarmError('No local model to load');
      return;
    }
    const seq = ++warmSeq.current;
    setWarmState('loading');
    setWarmError(null);
    bridge
      .warmLocal(id)
      .then((r) => {
        if (seq !== warmSeq.current) return; // superseded by a newer request
        if (r.loaded) {
          setWarmState('ready');
        } else {
          setWarmState('error');
          setWarmError(r.error || 'Model failed to load');
        }
        refresh();
      })
      .catch((err) => {
        if (seq !== warmSeq.current) return;
        setWarmState('error');
        setWarmError(err instanceof Error ? err.message : 'Model failed to load');
      });
  }, [bridge, localModelId, config, refresh]);

  return {
    choice,
    setChoice,
    forceMode,
    localModelId,
    installed,
    config,
    status,
    activeLabel,
    preload,
    warmState,
    warmError,
    refresh,
  };
}
