import { useUseCases } from '@/hooks/useUseCases';
import type { UseCase } from '@/types';

interface ArtHeaderProps {
  title: string;
  icon: string;
  ucId: string;
  onUcChange: (id: string) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}

export function ArtHeader({
  title, icon, ucId, onUcChange, dirty, saving, onSave,
}: ArtHeaderProps) {
  const { useCases } = useUseCases();

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="ch">
        <span className="ch-title">{icon} {title}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={ucId}
            onChange={e => onUcChange(e.target.value)}
            style={{ fontSize: 13, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
          >
            <option value="">— Use Case wählen —</option>
            {useCases.map((uc: UseCase) => (
              <option key={uc.id} value={uc.id}>
                {uc.id} — {uc.title}
              </option>
            ))}
          </select>
          <button
            className={`btn btn-sm art-save-btn${dirty ? ' dirty' : saving ? '' : ' saved'}`}
            onClick={onSave}
            disabled={saving || !ucId || !dirty}
          >
            {saving ? '⏳ Speichert…' : dirty ? '💾 Speichern' : '✓ Gespeichert'}
          </button>
        </div>
      </div>
    </div>
  );
}
