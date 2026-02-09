/// <reference lib="webworker" />

import init, { parse_and_normalize_detailed, renormalize_raw_events } from '../pkg/agendum_core';
import type { NormalizedEvent, ParseAndNormalizeDetailedResult } from '../types';
import type { IcsParserWorkerRequest, IcsParserWorkerResponse } from './icsParserWorkerTypes';

const workerScope = self as DedicatedWorkerGlobalScope;
let initPromise: Promise<void> | null = null;

async function ensureInit() {
  if (!initPromise) {
    initPromise = init().then(() => undefined);
  }
  await initPromise;
}

async function handleMessage(message: IcsParserWorkerRequest) {
  if (message.kind === 'init') {
    try {
      await ensureInit();
      const response: IcsParserWorkerResponse = { kind: 'init', ok: true };
      workerScope.postMessage(response);
    } catch (error) {
      const response: IcsParserWorkerResponse = {
        kind: 'init',
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to initialize parser worker',
      };
      workerScope.postMessage(response);
    }
    return;
  }

  if (message.kind === 'renormalize') {
    try {
      await ensureInit();
      const normalized = renormalize_raw_events(message.rawEvents) as NormalizedEvent[];
      const response: IcsParserWorkerResponse = {
        kind: 'renormalize',
        id: message.id,
        ok: true,
        result: normalized,
      };
      workerScope.postMessage(response);
    } catch (error) {
      const response: IcsParserWorkerResponse = {
        kind: 'renormalize',
        id: message.id,
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to renormalize events',
      };
      workerScope.postMessage(response);
    }
    return;
  }

  try {
    await ensureInit();
    const parsed = parse_and_normalize_detailed(message.content) as ParseAndNormalizeDetailedResult;
    const response: IcsParserWorkerResponse = {
      kind: 'parse',
      id: message.id,
      ok: true,
      result: parsed,
    };
    workerScope.postMessage(response);
  } catch (error) {
    const response: IcsParserWorkerResponse = {
      kind: 'parse',
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to parse ICS content',
    };
    workerScope.postMessage(response);
  }
}

workerScope.addEventListener('message', (event: MessageEvent<IcsParserWorkerRequest>) => {
  void handleMessage(event.data);
});
