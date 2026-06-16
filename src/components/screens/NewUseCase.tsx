import { useState } from 'react';
import { useUseCases } from '@/hooks/useUseCases';
import { useToast } from '@/context/ToastContext';
import { useTx } from '@/context/LanguageContext';
import UcForm from './UcForm';
import type { UseCase } from '@/types';

export default function NewUseCase({ onNav }: { onNav: (s: string) => void }) {
  const { createUC } = useUseCases();
  const { showToast } = useToast();
  const tx = useTx();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: Partial<UseCase>) {
    setSubmitting(true);
    try {
      const created = await createUC(
        data as Omit<UseCase, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
      );
      showToast(`✓ ${created.title} ${tx('gespeichert')}`, 'success');
      onNav('usecases');
    } catch (err) {
      showToast(`${tx('Fehler')}: ${String(err)}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="sec-title">{tx('Neuer Use Case')}</div>
      <div className="sec-sub">{tx('Erfassen Sie einen neuen KI-Use-Case im Portfolio.')}</div>

      <div className="card">
        <div className="mb">
          <UcForm
            onSubmit={handleSubmit}
            onCancel={() => onNav('usecases')}
            submitLabel={tx('Use Case anlegen')}
            isSubmitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
