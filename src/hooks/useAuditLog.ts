import useSWR from 'swr';
import { auditApi, swrFetcher } from '@/lib/api';
import type { AuditEntry } from '@/types';

export function useAuditLog(limit = 100) {
  const key = `/api/auditlog?limit=${limit}`;
  const { data, error, isLoading, mutate } = useSWR<AuditEntry[]>(key, swrFetcher);

  return {
    entries: data ?? [],
    loading: isLoading,
    error: error as Error | undefined,
    refresh: () => mutate(),
  };
}

export { auditApi };
