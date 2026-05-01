import useSWR, { useSWRConfig } from 'swr';
import { ucApi, swrFetcher } from '@/lib/api';
import type { UseCase } from '@/types';

const KEY = '/api/usecases';

export function useUseCases() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<UseCase[]>(KEY, swrFetcher);

  const useCases = (data ?? []).filter(uc => uc.act);

  async function createUC(payload: Omit<UseCase, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) {
    const created = await ucApi.create(payload);
    await mutate(KEY);
    return created;
  }

  async function updateUC(id: string, patch: Partial<UseCase>) {
    const updated = await ucApi.update(id, patch);
    await mutate(KEY);
    return updated;
  }

  async function deleteUC(id: string) {
    await ucApi.delete(id);
    await mutate(KEY);
  }

  return {
    useCases,
    loading: isLoading,
    error: error as Error | undefined,
    createUC,
    updateUC,
    deleteUC,
    refresh: () => mutate(KEY),
  };
}

export function useIncidents() {
  const { data, error, isLoading } = useSWR('/api/incidents', swrFetcher);
  return {
    incidents: (data ?? []) as import('@/types').Incident[],
    loading: isLoading,
    error: error as Error | undefined,
  };
}
