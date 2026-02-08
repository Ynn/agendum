import { useCallback, useEffect, useRef, useState } from 'react';
import initMain, { parse_and_normalize_detailed as parseDetailedOnMainThread } from '../pkg/agendum_core';
import type { ParseAndNormalizeDetailedResult } from '../types';
import type { IcsParserWorkerRequest, IcsParserWorkerResponse } from '../workers/icsParserWorkerTypes';

type PendingRequest = {
  resolve: (value: ParseAndNormalizeDetailedResult) => void;
  reject: (error: Error) => void;
};

export function useIcsParserWorker() {
  const workerRef = useRef<Worker | null>(null);
  const fallbackModeRef = useRef(false);
  const fallbackInitPromiseRef = useRef<Promise<void> | null>(null);
  const pendingRef = useRef<Map<number, PendingRequest>>(new Map());
  const nextIdRef = useRef(1);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const activateFallback = useCallback(async (reason: string) => {
    fallbackModeRef.current = true;
    if (!fallbackInitPromiseRef.current) {
      fallbackInitPromiseRef.current = initMain().then(() => undefined);
    }
    await fallbackInitPromiseRef.current;
    setIsReady(true);
    setInitError(reason);
  }, []);

  useEffect(() => {
    let worker: Worker;
    const pendingRequests = pendingRef.current;
    try {
      worker = new Worker(new URL('../workers/icsParser.worker.ts', import.meta.url), { type: 'module' });
    } catch (error) {
      void activateFallback(error instanceof Error ? error.message : 'Parser worker unavailable');
      return;
    }
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<IcsParserWorkerResponse>) => {
      const message = event.data;
      if (message.kind === 'init') {
        if (message.ok) {
          setIsReady(true);
          setInitError(null);
        } else {
          void activateFallback(message.error);
        }
        return;
      }

      const pending = pendingRequests.get(message.id);
      if (!pending) return;
      pendingRequests.delete(message.id);
      if (message.ok) {
        pending.resolve(message.result);
      } else {
        pending.reject(new Error(message.error));
      }
    };

    worker.onerror = () => {
      void activateFallback('Parser worker crashed');
    };

    const initMessage: IcsParserWorkerRequest = { kind: 'init' };
    worker.postMessage(initMessage);

    return () => {
      pendingRequests.forEach(({ reject }) => reject(new Error('Parser worker terminated')));
      pendingRequests.clear();
      worker.terminate();
      workerRef.current = null;
    };
  }, [activateFallback]);

  const parseIcsDetailed = useCallback((content: string) => {
    if (fallbackModeRef.current) {
      try {
        const parsed = parseDetailedOnMainThread(content) as ParseAndNormalizeDetailedResult;
        return Promise.resolve(parsed);
      } catch (error) {
        return Promise.reject(error instanceof Error ? error : new Error('Failed to parse ICS content'));
      }
    }
    const worker = workerRef.current;
    if (!worker) {
      return Promise.reject(new Error('Parser worker unavailable'));
    }
    const id = nextIdRef.current++;
    const request: IcsParserWorkerRequest = { kind: 'parse', id, content };
    return new Promise<ParseAndNormalizeDetailedResult>((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });
      worker.postMessage(request);
    });
  }, []);

  return {
    isReady,
    initError,
    parseIcsDetailed,
  };
}
