import useSWR, { useSWRConfig } from 'swr';
import { incApi, swrFetcher } from '@/lib/api';
import type { Incident } from '@/types';

const KEY = '/api/incidents';

export function useIncidents() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<Incident[]>(KEY, swrFetcher);

  const incidents = data ?? [];

  async function createIncident(
    payload: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  ) {
    const created = await incApi.create(payload);
    await mutate(KEY);
    return created;
  }

  async function updateIncident(id: string, patch: Partial<Incident>) {
    const updated = await incApi.update(id, patch);
    await mutate(KEY);
    return updated;
  }

  return {
    incidents,
    openCount:     incidents.filter(i => i.st === 'Open').length,
    inProgressCount: incidents.filter(i => i.st === 'In Progress').length,
    resolvedCount: incidents.filter(i => i.st === 'Resolved').length,
    loading: isLoading,
    error: error as Error | undefined,
    createIncident,
    updateIncident,
    refresh: () => mutate(KEY),
  };
}
