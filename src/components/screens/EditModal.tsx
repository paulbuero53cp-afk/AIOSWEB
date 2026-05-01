import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { useUseCases } from '@/hooks/useUseCases';
import { useToast } from '@/context/ToastContext';
import UcForm from './UcForm';
import type { UseCase } from '@/types';

interface EditModalProps {
  uc: UseCase | null;
  onClose: () => void;
}

export default function EditModal({ uc, onClose }: EditModalProps) {
  const { updateUC } = useUseCases();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: Partial<UseCase>) {
    if (!uc) return;
    setSubmitting(true);
    try {
      await updateUC(uc.id, data);
      showToast(`✓ ${uc.title} gespeichert`, 'success');
      onClose();
    } catch (err) {
      showToast(`Fehler: ${String(err)}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={uc !== null}
      title={uc ? `Bearbeiten: ${uc.title}` : ''}
      onClose={onClose}
      wide
    >
      {uc && (
        <UcForm
          defaultValues={uc}
          onSubmit={handleSubmit}
          onCancel={onClose}
          submitLabel="Änderungen speichern"
          isSubmitting={submitting}
        />
      )}
    </Modal>
  );
}
