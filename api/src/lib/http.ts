// ─────────────────────────────────────────────────────────────
//  AIOS — HTTP-Helfer
//  Einheitliche Fehlerantwort: Details NUR ins Log, an den Client
//  geht eine generische Message + Correlation-ID (F4 — kein Leak
//  von Graph-/Stacktrace-Interna).
// ─────────────────────────────────────────────────────────────

import { HttpResponseInit, InvocationContext } from '@azure/functions';

export function serverError(context: InvocationContext, err: unknown): HttpResponseInit {
  context.error(`[${context.invocationId}]`, err);
  return {
    status: 500,
    jsonBody: { error: 'Interner Fehler', ref: context.invocationId },
  };
}
