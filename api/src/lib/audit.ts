// ─────────────────────────────────────────────────────────────
//  AIOS — Audit Log Helper
//  Jede schreibende Aktion loggt einen unveränderlichen Eintrag
// ─────────────────────────────────────────────────────────────

import { createItem } from './storage';
import { auditToSp } from './mappers';
import type { ClientPrincipal } from './auth';

export type AuditAction =
  | 'create' | 'edit' | 'approve' | 'reject'
  | 'delete' | 'save-artefakt' | 'inline-edit'
  | 'role-change' | 'config-change' | 'export';

export type AuditEntity =
  | 'UseCase' | 'Incident' | 'Artefakt' | 'User' | 'Config';

export async function writeAuditLog(
  actor: ClientPrincipal,
  action: AuditAction,
  entity: AuditEntity,
  entityId: string,
  diff: Record<string, { von: unknown; auf: unknown }> = {},
  comment = '',
): Promise<void> {
  const id = `AL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  await createItem('AUDITLOG', {
    Title: id,
    ...auditToSp({
      id,
      actor:    actor.userDetails,
      action,
      entity,
      entityId,
      diff:     diff as Record<string, unknown>,
      comment,
    }),
  });
}

/** Vergleicht zwei Objekte und gibt nur geänderte Felder zurück */
export function diffObjects(
  before: Record<string, unknown>,
  after:  Record<string, unknown>,
): Record<string, { von: unknown; auf: unknown }> {
  const diff: Record<string, { von: unknown; auf: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    const bVal = JSON.stringify(before[key]);
    const aVal = JSON.stringify(after[key]);
    if (bVal !== aVal) {
      diff[key] = { von: before[key], auf: after[key] };
    }
  }
  return diff;
}
