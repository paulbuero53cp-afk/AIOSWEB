import useSWR, { useSWRConfig } from 'swr';
import { isoApi, swrFetcher } from '@/lib/api';
import type { IsoQuestion, IsoAnswer } from '@/types';

const Q_KEY = '/api/iso/questions';
const A_KEY = '/api/iso/answers';

export function useIsoQuestions() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<IsoQuestion[]>(Q_KEY, swrFetcher);

  async function importQuestions(rows: Partial<IsoQuestion>[]) {
    const result = await isoApi.importQuestions(rows);
    await mutate(Q_KEY);
    return result;
  }

  return {
    questions: data ?? [],
    loading: isLoading,
    error: error as Error | undefined,
    importQuestions,
    refresh: () => mutate(Q_KEY),
  };
}

export function useIsoAnswers() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<IsoAnswer[]>(A_KEY, swrFetcher);

  async function saveAnswer(questionId: string, patch: Partial<IsoAnswer>) {
    const saved = await isoApi.saveAnswer(questionId, patch);
    await mutate(A_KEY);
    return saved;
  }

  async function importAnswers(rows: Partial<IsoAnswer>[]) {
    const result = await isoApi.importAnswers(rows);
    await mutate(A_KEY);
    return result;
  }

  return {
    answers: data ?? [],
    loading: isLoading,
    error: error as Error | undefined,
    saveAnswer,
    importAnswers,
    refresh: () => mutate(A_KEY),
  };
}
