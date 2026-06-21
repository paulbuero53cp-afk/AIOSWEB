// ─────────────────────────────────────────────────────────────
//  AIOS — /api/exchange
//
//  POST /api/exchange/export   → UC-Bundle exportieren (Admin)
//  POST /api/exchange/import   → UC-Bundle importieren (Admin)
//
//  Bundle-Format: { exportVersion, exportedAt, source, count, useCases[] }
//  Jeder Eintrag: { useCase: UseCase, artefakte: { ra?, gc?, bc?, dsfa? } }
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireRole, isAuthError } from '../lib/auth';
import { listItems, findItem, createItem, updateItem, odataEscape } from '../lib/storage';
import { serverError } from '../lib/http';
import { spToUC, ucToSp, UseCase, spToArtefakt, artefaktToSp, Artefakt } from '../lib/mappers';
import { writeAuditLog } from '../lib/audit';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';
const EXPORT_VERSION = '1.0';
const VALID_ART_TYPES = ['ra', 'gc', 'bc', 'dsfa'];

interface UcBundleEntry {
  useCase: UseCase;
  artefakte: Record<string, Record<string, unknown>>;
}

interface UcBundle {
  exportVersion: string;
  exportedAt: string;
  source: string;
  count: number;
  useCases: UcBundleEntry[];
}

interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
}

// ── POST /api/exchange/export ─────────────────────────────────
async function handleExport(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = await req.json().catch(() => ({})) as { ucIds?: string[] };
  const ucIds = Array.isArray(body.ucIds) && body.ucIds.length > 0 ? body.ucIds : null;

  if (MOCK) {
    return {
      status: 200,
      jsonBody: { exportVersion: EXPORT_VERSION, exportedAt: new Date().toISOString(), source: 'AIOS', count: 0, useCases: [] },
    };
  }

  // 1. UCs laden, nach Selektion oder alle aktiven
  const allUcItems = await listItems('USECASES');
  const ucs = allUcItems
    .map(item => spToUC(item.id, item.fields as Record<string, unknown>))
    .filter(uc => ucIds ? ucIds.includes(uc.id) : uc.act);

  // 2. Alle Artefakte in einem Batch laden und nach UCId gruppieren
  const allArtItems = await listItems('ARTEFAKTE');
  const artByUcId: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const item of allArtItems) {
    const art = spToArtefakt(item.id, item.fields as Record<string, unknown>);
    if (!VALID_ART_TYPES.includes(art.type)) continue;
    if (!artByUcId[art.ucId]) artByUcId[art.ucId] = {};
    artByUcId[art.ucId][art.type] = art.payload;
  }

  // 3. Bundle zusammenstellen
  const entries: UcBundleEntry[] = ucs.map(uc => ({
    useCase: uc,
    artefakte: artByUcId[uc.id] ?? {},
  }));

  const bundle: UcBundle = {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'AIOS',
    count: entries.length,
    useCases: entries,
  };

  await writeAuditLog(
    principal, 'export', 'UseCase',
    ucIds ? ucIds.join(',') : 'ALL',
    {}, `Bundle-Export: ${entries.length} Use Cases`,
  );

  return { status: 200, jsonBody: bundle };
}

// ── POST /api/exchange/import ─────────────────────────────────
async function handleImport(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = await requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const bundle = await req.json().catch(() => null) as UcBundle | null;

  if (!bundle?.useCases || !Array.isArray(bundle.useCases)) {
    return { status: 400, jsonBody: { error: 'Ungültiges Bundle-Format (useCases fehlt)' } };
  }

  const result: ImportResult = { imported: 0, updated: 0, errors: [] };
  const now = new Date().toISOString();

  if (MOCK) {
    return { status: 200, jsonBody: { imported: bundle.useCases.length, updated: 0, errors: [] } };
  }

  for (const entry of bundle.useCases) {
    const uc = entry.useCase as UseCase | undefined;
    if (!uc?.id || !uc?.title) {
      result.errors.push('Ungültiger Eintrag: id oder title fehlt');
      continue;
    }

    try {
      // UC upserten (Abgleich über UCId-Feld)
      const existingUc = await findItem('USECASES', `fields/UCId eq '${odataEscape(uc.id)}'`);
      const ucPatch: Partial<UseCase> = { ...uc, updatedAt: now, updatedBy: principal.userDetails };
      const spFields = ucToSp(ucPatch);

      if (existingUc) {
        await updateItem('USECASES', existingUc.id, spFields);
        result.updated++;
      } else {
        // UCId aus dem Bundle übernehmen — kein auto-generated ID bei Import
        await createItem('USECASES', { Title: uc.title, ...spFields });
        result.imported++;
      }

      // Artefakte upserten
      for (const [type, payload] of Object.entries(entry.artefakte ?? {})) {
        if (!VALID_ART_TYPES.includes(type) || !payload || typeof payload !== 'object') continue;

        const existingArt = await findItem(
          'ARTEFAKTE',
          `fields/UCId eq '${odataEscape(uc.id)}' and fields/ArtType eq '${odataEscape(type)}'`,
        );

        const artData: Partial<Artefakt> = {
          ucId: uc.id, type: type as Artefakt['type'],
          payload: payload as Record<string, unknown>,
          savedAt: now, savedBy: principal.userDetails,
        };
        const artSpFields = artefaktToSp(artData);

        if (existingArt) {
          await updateItem('ARTEFAKTE', existingArt.id, artSpFields);
        } else {
          await createItem('ARTEFAKTE', { Title: `${uc.id}-${type}`, ...artSpFields });
        }
      }

      await writeAuditLog(
        principal, 'import', 'UseCase', uc.id, {},
        existingUc ? 'aktualisiert' : 'neu importiert',
      );
    } catch (err) {
      result.errors.push(`${uc.id}: ${String(err)}`);
    }
  }

  return { status: 200, jsonBody: result };
}

// ── Router ────────────────────────────────────────────────────
async function exchangeHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const action = req.params['action'];
  context.log(`${req.method} /api/exchange/${action}`);

  try {
    if (req.method === 'POST' && action === 'export') return await handleExport(req);
    if (req.method === 'POST' && action === 'import') return await handleImport(req);
    return { status: 404 };
  } catch (err) {
    return serverError(context, err);
  }
}

app.http('exchange', {
  methods: ['POST'],
  route: 'exchange/{action}',
  authLevel: 'anonymous',
  handler: exchangeHandler,
});
