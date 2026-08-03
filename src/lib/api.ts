// ─────────────────────────────────────────────────────────────
//  AIOS — API Client
//  Alle Calls gehen gegen /api/* (Azure Functions via SWA-Proxy)
//  Kein direkter Graph-Aufruf aus dem Frontend
// ─────────────────────────────────────────────────────────────
import type { UseCase, Incident, AuditEntry, AppConfig, AiTool, IsoQuestion, IsoAnswer } from '@/types';

const BASE = '/api';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    // X-Requested-With: CSRF-Schutz (F16) — wird vom Backend bei Writes verlangt.
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'AIOS', ...options?.headers },
  });

  // Session abgelaufen: SWA leitet 401 → /.auth/login/aad um, fetch() folgt dem
  // Redirect automatisch und landet auf der Login-Seite (HTML statt JSON).
  // Sauberer Re-Login statt kryptischem "Unexpected token '<'" JSON-Parse-Fehler.
  if (res.redirected) {
    window.location.href = '/.auth/login/aad';
    return new Promise<T>(() => {}); // Navigation läuft — Promise löst absichtlich nie auf
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Use Cases ─────────────────────────────────────────────────
export const ucApi = {
  list: () => apiFetch<UseCase[]>('/usecases'),

  get: (id: string) => apiFetch<UseCase>(`/usecases/${id}`),

  create: (data: Omit<UseCase, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) =>
    apiFetch<UseCase>('/usecases', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<UseCase>) =>
    apiFetch<UseCase>(`/usecases/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  delete: (id: string) =>
    apiFetch<void>(`/usecases/${id}`, { method: 'DELETE' }),
};

// ── Incidents ─────────────────────────────────────────────────
export const incApi = {
  list: () => apiFetch<Incident[]>('/incidents'),

  create: (data: Omit<Incident, 'id'>) =>
    apiFetch<Incident>('/incidents', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<Incident>) =>
    apiFetch<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
};

// ── Artefakte (RA / GC / BC / DSFA) ──────────────────────────
export type ArtefaktType = 'ra' | 'gc' | 'bc' | 'dsfa';

export const artApi = {
  get: <T>(type: ArtefaktType, ucId: string) =>
    apiFetch<T>(`/artefakte/${type}/${ucId}`),

  save: <T>(type: ArtefaktType, ucId: string, data: T) =>
    apiFetch<T>(`/artefakte/${type}/${ucId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Alle Artefakte eines UC (für Dokumentations-Hub)
  getAll: (ucId: string) =>
    apiFetch<{ ra?: unknown; gc?: unknown; bc?: unknown; dsfa?: unknown }>(`/artefakte/all/${ucId}`),

  // Vollexport für JSON-Backup
  exportAll: () => apiFetch<Record<string, unknown>>('/artefakte/export'),
};

// ── AI Tools (Register erlaubter KI-Tools) ───────────────────
export const aiToolApi = {
  list: () => apiFetch<AiTool[]>('/aitools'),

  create: (data: Partial<AiTool>) =>
    apiFetch<AiTool>('/aitools', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, patch: Partial<AiTool>) =>
    apiFetch<AiTool>(`/aitools/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  delete: (id: string) =>
    apiFetch<void>(`/aitools/${id}`, { method: 'DELETE' }),

  // Änderungshistorie dieses Tools (scoped, requireUser)
  history: (id: string) => apiFetch<AuditEntry[]>(`/aitools/${id}`),
};

// ── Audit Log ─────────────────────────────────────────────────
export const auditApi = {
  list: (limit = 100, entity?: string, entityId?: string) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (entity)   p.set('entity', entity);
    if (entityId) p.set('entityId', entityId);
    return apiFetch<AuditEntry[]>(`/auditlog?${p.toString()}`);
  },
};

// ── Config ────────────────────────────────────────────────────
export const configApi = {
  get: () => apiFetch<AppConfig>('/config'),
  save: (data: Partial<AppConfig>) =>
    apiFetch<AppConfig>('/config', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Data Exchange (UC-Bundle Export / Import) ─────────────────
export interface UcBundle {
  exportVersion: string;
  exportedAt: string;
  source: string;
  count: number;
  useCases: Array<{
    useCase: unknown;
    artefakte: Record<string, unknown>;
  }>;
}

export interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
}

export const exchangeApi = {
  export: (ucIds?: string[]) =>
    apiFetch<UcBundle>('/exchange/export', {
      method: 'POST',
      body: JSON.stringify({ ucIds }),
    }),

  import: (bundle: UcBundle) =>
    apiFetch<ImportResult>('/exchange/import', {
      method: 'POST',
      body: JSON.stringify(bundle),
    }),
};

// ── ISO 42001 Governance ──────────────────────────────────────
export interface IsoImportResult { imported: number; updated: number; errors: string[] }

export const isoApi = {
  questions: () => apiFetch<IsoQuestion[]>('/iso/questions'),
  answers:   () => apiFetch<IsoAnswer[]>('/iso/answers'),

  saveAnswer: (questionId: string, patch: Partial<IsoAnswer>) =>
    apiFetch<IsoAnswer>(`/iso/answers/${questionId}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  importQuestions: (rows: Partial<IsoQuestion>[]) =>
    apiFetch<IsoImportResult>('/iso/questions/import', { method: 'POST', body: JSON.stringify({ rows }) }),

  importAnswers: (rows: Partial<IsoAnswer>[]) =>
    apiFetch<IsoImportResult>('/iso/answers/import', { method: 'POST', body: JSON.stringify({ rows }) }),
};

// ── SWR Fetcher (kompatibel mit useSWR) ──────────────────────
export const swrFetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });
