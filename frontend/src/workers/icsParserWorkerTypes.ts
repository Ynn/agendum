import type { ParseAndNormalizeDetailedResult } from '../types';

export type IcsParserWorkerRequest =
  | { kind: 'init' }
  | { kind: 'parse'; id: number; content: string };

export type IcsParserWorkerResponse =
  | { kind: 'init'; ok: true }
  | { kind: 'init'; ok: false; error: string }
  | { kind: 'parse'; id: number; ok: true; result: ParseAndNormalizeDetailedResult }
  | { kind: 'parse'; id: number; ok: false; error: string };
