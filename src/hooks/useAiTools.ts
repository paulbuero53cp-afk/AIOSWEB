import useSWR, { useSWRConfig } from 'swr';
import { aiToolApi, swrFetcher } from '@/lib/api';
import type { AiTool } from '@/types';

const KEY = '/api/aitools';

export function useAiTools() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<AiTool[]>(KEY, swrFetcher);

  const tools = (data ?? []).filter(t => t.active);

  async function createTool(payload: Partial<AiTool>) {
    const created = await aiToolApi.create(payload);
    await mutate(KEY);
    return created;
  }

  async function updateTool(id: string, patch: Partial<AiTool>) {
    const updated = await aiToolApi.update(id, patch);
    await mutate(KEY);
    return updated;
  }

  async function deleteTool(id: string) {
    await aiToolApi.delete(id);
    await mutate(KEY);
  }

  return {
    tools,
    loading: isLoading,
    error: error as Error | undefined,
    createTool,
    updateTool,
    deleteTool,
    refresh: () => mutate(KEY),
  };
}
