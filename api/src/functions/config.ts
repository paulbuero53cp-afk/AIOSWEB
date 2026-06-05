// ─────────────────────────────────────────────────────────────
//  AIOS — /api/config
//
//  GET  /api/config         → COMPANY-Objekt laden
//  POST /api/config         → COMPANY-Objekt speichern (Admin)
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth, requireRole, isAuthError } from '../lib/auth';
import { listItems, createItem, updateItem } from '../lib/storage';

// CONFIG-Liste hat < 10 Einträge → alle laden, in JS filtern (kein SP-Index nötig)
async function findConfigItem(key: string) {
  const items = await listItems('CONFIG');
  return items.find(i => i.fields['ConfigKey'] === key || i.fields['Title'] === key) ?? null;
}

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

interface AppConfig {
  name: string;
  short: string;
  tag: string;
  iso: string;
  chatbot: { enabled: boolean; label: string; url: string; hint: string };
}

const DEFAULT_CONFIG: AppConfig = {
  name:    'STOCKMEIER',
  short:   'AIOS',
  tag:     'AI Management System',
  iso:     'ISO 42001 aligned',
  chatbot: { enabled: true, label: 'AI-Assistent', url: 'https://claude.ai', hint: 'Fragen zum AIOS?' },
};

async function handleGet(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = requireAuth(req);
  if (isAuthError(principal)) return principal;

  if (MOCK) return { status: 200, jsonBody: DEFAULT_CONFIG };

  const item = await findConfigItem('COMPANY');
  if (!item) return { status: 200, jsonBody: DEFAULT_CONFIG };

  try {
    const fields = item.fields as Record<string, unknown>;
    const config = JSON.parse(String(fields['ConfigValue'] ?? '{}')) as AppConfig;
    return { status: 200, jsonBody: { ...DEFAULT_CONFIG, ...config } };
  } catch {
    return { status: 200, jsonBody: DEFAULT_CONFIG };
  }
}

async function handlePost(req: HttpRequest): Promise<HttpResponseInit> {
  const principal = requireRole(req, ['AIOS.Admin']);
  if (isAuthError(principal)) return principal;

  const body = await req.json() as Partial<AppConfig>;
  if (MOCK) return { status: 200, jsonBody: { ...DEFAULT_CONFIG, ...body } };
  const configJson = JSON.stringify(body);

  const existing = await findConfigItem('COMPANY');
  if (existing) {
    await updateItem('CONFIG', existing.id, { ConfigValue: configJson });
  } else {
    await createItem('CONFIG', {
      Title:       'COMPANY',
      ConfigKey:   'COMPANY',
      ConfigValue: configJson,
    });
  }

  return { status: 200, jsonBody: { ...DEFAULT_CONFIG, ...body } };
}

async function configHandler(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log(`${req.method} /api/config`);
  try {
    if (req.method === 'GET')  return await handleGet(req);
    if (req.method === 'POST') return await handlePost(req);
    return { status: 405 };
  } catch (err) {
    context.error('config error:', err);
    return { status: 500, jsonBody: { error: String(err) } };
  }
}

app.http('config', {
  methods: ['GET', 'POST'],
  route: 'config',
  authLevel: 'anonymous',
  handler: configHandler,
});
