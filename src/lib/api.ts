// ─────────────────────────────────────────────────────────────
//  AIOS — API Client
//  Alle Calls gehen gegen /api/* (Azure Functions via SWA-Proxy)
//  Kein direkter Graph-Aufruf aus dem Frontend
// ─────────────────────────────────────────────────────────────
import type { UseCase, Incident, AuditEntry, AppConfig } from '@/types';

const BASE = '/api';

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

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

// ── Audit Log ─────────────────────────────────────────────────
export const auditApi = {
  list: (limit = 100) => apiFetch<AuditEntry[]>(`/auditlog?limit=${limit}`),
};

// ── Config ────────────────────────────────────────────────────
export const configApi = {
  get: () => apiFetch<AppConfig>('/config'),
  save: (data: Partial<AppConfig>) =>
    apiFetch<AppConfig>('/config', { method: 'POST', body: JSON.stringify(data) }),
};

// ── SWR Fetcher (kompatibel mit useSWR) ──────────────────────
export const swrFetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });
