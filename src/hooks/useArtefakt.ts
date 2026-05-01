import useSWR, { useSWRConfig } from 'swr';
import { artApi, swrFetcher } from '@/lib/api';
import type { ArtefaktType } from '@/lib/api';

// ── Generischer Hook für alle 4 Artefakt-Typen ───────────────
export function useArtefakt<T extends Record<string, unknown>>(
  type: ArtefaktType,
  ucId: string | null,
) {
  const key = ucId ? `/api/artefakte/${type}/${ucId}` : null;
  const { mutate } = useSWRConfig();
  const { data, isLoading } = useSWR<T>(key, swrFetcher);

  async function save(payload: T): Promise<void> {
    if (!ucId) return;
    await artApi.save<T>(type, ucId, payload);
    await mutate(key);
  }

  return {
    data: data ?? ({} as T),
    loading: isLoading,
    save,
    refresh: () => mutate(key),
  };
}

// ── Hilfsfunktion: alle 4 Artefakte eines UC ─────────────────
export function useArtefaktHub(ucId: string | null) {
  const key = ucId ? `/api/artefakte/all/${ucId}` : null;
  const { data, isLoading } = useSWR(key, swrFetcher);
  return { hub: data, loading: isLoading };
}
