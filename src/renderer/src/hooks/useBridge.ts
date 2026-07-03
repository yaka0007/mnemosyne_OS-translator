/**
 * Translator Bridge — Cartridge-to-host communication via postMessage.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';

const PLUGIN_ID = '@mnemosyne-plugins/translator';
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Best-effort host origin for a targeted postMessage — never broadcast to '*'.
 * Restrict to the parent host's concrete origin; fall back to '*' only for
 * opaque/file:// hosts so delivery never breaks (host also validates source).
 */
function resolveHostOrigin(): string {
  const usable = (o: string | null | undefined): o is string => !!o && o !== 'null' && o !== 'file://';
  try { const ao = window.location.ancestorOrigins?.[0]; if (usable(ao)) return ao; } catch { /* unavailable */ }
  try { if (document.referrer) { const o = new URL(document.referrer).origin; if (usable(o)) return o; } } catch { /* none */ }
  return '*';
}
const MNEMO_HOST_ORIGIN = resolveHostOrigin();

type PendingResolve = {
  resolve: (data: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const pendingRequests = new Map<string, PendingResolve>();
let listenerAttached = false;
let reqCounter = 0;

function attachGlobalListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== window.parent) return; // only the host frame may answer
    if (e.data?.type !== 'MNEMO_PLUGIN_REPLY') return;
    const { messageId, success, data, error } = e.data;
    const pending = pendingRequests.get(messageId);
    if (!pending) return;
    pendingRequests.delete(messageId);
    clearTimeout(pending.timer);
    success ? pending.resolve(data) : pending.reject(new Error(error || 'Bridge error'));
  });
}

function sendRequest(action: string, payload?: any): Promise<any> {
  attachGlobalListener();
  const messageId = `translator-${++reqCounter}-${Date.now()}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(messageId);
      reject(new Error(`Bridge timeout: ${action}`));
    }, REQUEST_TIMEOUT_MS);
    pendingRequests.set(messageId, { resolve, reject, timer });
    window.parent.postMessage({
      type: 'MNEMO_PLUGIN_REQUEST',
      pluginId: PLUGIN_ID,
      messageId,
      action,
      payload,
    }, MNEMO_HOST_ORIGIN);
  });
}

export interface TranslatorBridge {
  connected: boolean;
  translate: (text: string, sourceLang: string, targetLang: string) => Promise<string>;
}

export function useTranslatorBridge(): TranslatorBridge {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    window.parent.postMessage({
      type: 'MNEMO_PLUGIN_TITLE',
      pluginId: PLUGIN_ID,
      title: 'Translator',
    }, MNEMO_HOST_ORIGIN);

    sendRequest('getStatus').then(() => setConnected(true)).catch(() => setConnected(false));

    return () => {
      window.parent.postMessage({ type: 'MNEMO_PLUGIN_TITLE', pluginId: null, title: null }, MNEMO_HOST_ORIGIN);
    };
  }, []);

  const translate = useCallback(async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
    const res = await sendRequest('translator.translate', { text, sourceLang, targetLang });
    if (res?.success) return res.text || '';
    throw new Error(res?.error || 'Translation failed');
  }, []);

  return useMemo(() => ({ connected, translate }), [connected, translate]);
}
