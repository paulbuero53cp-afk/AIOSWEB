// ─────────────────────────────────────────────────────────────
//  AIOS — ISO 42001 Governance
//
//  GET   /api/iso/questions            → Fragenkatalog
//  POST  /api/iso/questions/import     → Bulk-Import Fragen (Admin, CSV-Rows)
//  GET   /api/iso/answers              → alle Antworten
//  PATCH /api/iso/answers/{questionId} → Antwort speichern (Upsert, Editor+)
//  POST  /api/iso/answers/import       → Bulk-Import Antworten (Admin, CSV-Rows)
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireUser, requireRole, isAuthError } from '../lib/auth';
import { listItems, findItem, createItem, updateItem, odataEscape } from '../lib/storage';
import { serverError } from '../lib/http';
import {
  spToIsoQuestion, isoQuestionToSp, IsoQuestion,
  spToIsoAnswer, isoAnswerToSp, IsoAnswer,
} from '../lib/mappers';
import { writeAuditLog, diffObjects } from '../lib/audit';
import { MOCK_ISO_QUESTIONS, MOCK_ISO_ANSWERS } from '../lib/mockData';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

// ── Fragen ──────────────────────────────────────────────────────

async function handleGetQuestions(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireUser(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: MOCK_ISO_QUESTIONS };

  const spItems = await listItems('ISOQUESTIONS');
  const questions: IsoQuestion[] = spItems.map(item =>
    spToIsoQuestion(item.id, item.fields as Record<string, unknown>));
  return { status: 200, jsonBody: questions };
}

async function handleImportQuestions(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = await req.json() as { rows?: Partial<IsoQuestion>[] };
  const rows = body.rows ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: 400, jsonBody: { error: 'rows ist ein Pflichtfeld (Array)' } };
  }

  if (MOCK) return { status: 200, jsonBody: { imported: rows.length, updated: 0 } };

  let imported = 0, updated = 0;
  const errors: string[] = [];
  for (const row of rows) {
    if (!row.id) { errors.push('Zeile ohne id übersprungen'); continue; }
    try {
      const existing = await findItem('ISOQUESTIONS', `fields/QuestionId eq '${odataEscape(row.id)}'`);
      const fields = isoQuestionToSp(row);
      if (existing) {
        await updateItem('ISOQUESTIONS', existing.id, fields);
        updated++;
      } else {
        await createItem('ISOQUESTIONS', { Title: row.id, ...fields });
        imported++;
      }
    } catch (err) {
      errors.push(`${row.id}: ${String(err)}`);
    }
  }

  await writeAuditLog(principal, 'import', 'Artefakt', 'iso-questions-import',
    { imported: { von: 0, auf: imported }, updated: { von: 0, auf: updated } },
    `ISO-Fragenkatalog importiert: ${imported} neu, ${updated} aktualisiert`);

  return { status: 200, jsonBody: { imported, updated, errors } };
}

// ── Antworten ───────────────────────────────────────────────────

async function handleGetAnswers(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireUser(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: MOCK_ISO_ANSWERS };

  const spItems = await listItems('ISOANSWERS');
  const answers: IsoAnswer[] = spItems.map(item =>
    spToIsoAnswer(item.id, item.fields as Record<string, unknown>));
  return { status: 200, jsonBody: answers };
}

async function handlePatchAnswer(req: HttpRequest, questionId: string): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Editor', 'AIOS.Approver', 'AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = await req.json() as Partial<IsoAnswer>;

  if (MOCK) {
    return { status: 200, jsonBody: { questionId, ...body, updatedAt: new Date().toISOString(), updatedBy: principal.userDetails } };
  }

  const patch: Partial<IsoAnswer> = {
    ...body,
    questionId,
    updatedBy: principal.userDetails,
  };
  const fields = isoAnswerToSp(patch);

  const existing = await findItem('ISOANSWERS', `fields/QuestionId eq '${odataEscape(questionId)}'`);
  let result: IsoAnswer;
  if (existing) {
    const before = spToIsoAnswer(existing.id, existing.fields as Record<string, unknown>);
    await updateItem('ISOANSWERS', existing.id, fields);
    result = { ...before, ...patch } as IsoAnswer;
    await writeAuditLog(principal, 'edit', 'Artefakt', questionId,
      diffObjects(before as unknown as Record<string, unknown>, result as unknown as Record<string, unknown>),
      `ISO-Antwort ${questionId} aktualisiert`);
  } else {
    const created = await createItem('ISOANSWERS', { Title: questionId, ...fields });
    result = spToIsoAnswer(created.id, created.fields as Record<string, unknown>);
    await writeAuditLog(principal, 'create', 'Artefakt', questionId,
      diffObjects({}, result as unknown as Record<string, unknown>),
      `ISO-Antwort ${questionId} angelegt`);
  }

  return { status: 200, jsonBody: result };
}

async function handleImportAnswers(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = await req.json() as { rows?: Partial<IsoAnswer>[] };
  const rows = body.rows ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return { status: 400, jsonBody: { error: 'rows ist ein Pflichtfeld (Array)' } };
  }

  if (MOCK) return { status: 200, jsonBody: { imported: rows.length, updated: 0 } };

  let imported = 0, updated = 0;
  const errors: string[] = [];
  for (const row of rows) {
    if (!row.questionId) { errors.push('Zeile ohne questionId übersprungen'); continue; }
    try {
      const fields = isoAnswerToSp({ ...row, updatedBy: principal.userDetails });
      const existing = await findItem('ISOANSWERS', `fields/QuestionId eq '${odataEscape(row.questionId)}'`);
      if (existing) {
        await updateItem('ISOANSWERS', existing.id, fields);
        updated++;
      } else {
        await createItem('ISOANSWERS', { Title: row.questionId, ...fields });
        imported++;
      }
    } catch (err) {
      errors.push(`${row.questionId}: ${String(err)}`);
    }
  }

  await writeAuditLog(principal, 'import', 'Artefakt', 'iso-answers-import',
    { imported: { von: 0, auf: imported }, updated: { von: 0, auf: updated } },
    `ISO-Antworten importiert: ${imported} neu, ${updated} aktualisiert`);

  return { status: 200, jsonBody: { imported, updated, errors } };
}

// ── Router ────────────────────────────────────────────────────
async function isoHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const resource = req.params['resource']; // 'questions' | 'answers'
  const segment  = req.params['segment'];  // 'import' | questionId | undefined
  const method   = req.method.toUpperCase();
  context.log(`${method} /api/iso/${resource}${segment ? '/' + segment : ''}`);

  try {
    if (resource === 'questions') {
      if (method === 'GET' && !segment) return await handleGetQuestions(req);
      if (method === 'POST' && segment === 'import') return await handleImportQuestions(req);
    }
    if (resource === 'answers') {
      if (method === 'GET' && !segment) return await handleGetAnswers(req);
      if (method === 'POST' && segment === 'import') return await handleImportAnswers(req);
      if (method === 'PATCH' && segment) return await handlePatchAnswer(req, segment);
    }
    return { status: 404, jsonBody: { error: 'Unbekannte Route' } };
  } catch (err) {
    return serverError(context, err);
  }
}

app.http('iso', {
  methods: ['GET', 'POST', 'PATCH'],
  route: 'iso/{resource}/{segment?}',
  authLevel: 'anonymous',
  handler: isoHandler,
});
