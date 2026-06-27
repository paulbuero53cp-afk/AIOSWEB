// ─────────────────────────────────────────────────────────────
//  AIOS — /api/submit  (kein Auth erforderlich)
//
//  Öffentliches Einreichungsformular für neue KI-Use Cases.
//  Erstellt einen UC-Draft mit pd='Backlog', lc='Idea', app='Pending'.
//  Sichtbar für Admins/Editoren in der UC-Liste (Backlog-Filter).
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { listItems, createItem } from '../lib/storage';
import { ucToSp } from '../lib/mappers';
import { serverError } from '../lib/http';

const MOCK = process.env['USE_MOCK_DATA'] === 'true';

interface SubmitBody {
  title?: string;
  desc?: string;
  cl?: string;
  own?: string;
  sys?: string;
  note?: string;
}

async function generateDraftId(): Promise<string> {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const pfx = `UC-${yr}-${mo}-`;
  const allItems = await listItems('USECASES');
  const maxSeq = allItems.reduce((max, item) => {
    const id = String((item.fields as Record<string, unknown>)['UCId'] ?? '');
    if (!id.startsWith(pfx)) return max;
    const seq = parseInt(id.slice(pfx.length), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);
  return `${pfx}${String(maxSeq + 1).padStart(3, '0')}`;
}

async function handleSubmit(req: HttpRequest): Promise<HttpResponseInit> {
  if (req.method !== 'POST') {
    return { status: 405, jsonBody: { error: 'Method not allowed' } };
  }

  const body = await req.json() as SubmitBody;

  if (!body.title?.trim()) {
    return { status: 400, jsonBody: { error: 'title ist Pflichtfeld' } };
  }

  if (MOCK) {
    return {
      status: 201,
      jsonBody: {
        id: `UC-MOCK-${Date.now()}`,
        message: 'Einreichung erfasst (Mock-Modus).',
      },
    };
  }

  const now  = new Date().toISOString();
  const id   = await generateDraftId();

  // Anmerkung in die Beschreibung einbauen
  const desc = [body.desc?.trim(), body.note?.trim() ? `Anmerkung: ${body.note.trim()}` : '']
    .filter(Boolean).join('\n\n');

  const uc = ucToSp({
    id,
    title:  body.title.trim(),
    cl:     body.cl?.trim()  || 'Sonstiges',
    own:    body.own?.trim() || 'Einreichung',
    sys:    body.sys?.trim() || '',
    legacy: '',
    cap:    'Generative KI',
    useCaseCategory: 'Sonstiges',
    kiType: [],
    auto:   'Empfehlung (Mensch entscheidet)',
    lc:     'Idea',
    pd:     'Backlog',
    rt:     'Low',
    tier:   '1',
    rev:    'yes',
    vs: 1, fs: 1, rs: 1,
    kpi:  'no',
    app:  'Pending',
    or:   'Not ready',
    hitl: 'yes',
    gt:   [false, false, false, false],
    sb:   [false, false, false, false],
    mc:   [false, false, false, false, false, false, false],
    act:  true,
    desc,
    link: '',
    createdAt: now,
    updatedAt: now,
    createdBy: 'Einreichung',
    updatedBy: 'Einreichung',
  });

  await createItem('USECASES', uc);

  return {
    status: 201,
    jsonBody: {
      id,
      message: `Einreichung ${id} erfasst. Das Governance-Team wird sich melden.`,
    },
  };
}

app.http('submit', {
  methods: ['POST', 'OPTIONS'],
  route: 'submit',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return {
        status: 204,
        headers: { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
      };
    }
    context.log('POST /api/submit');
    try {
      return await handleSubmit(req);
    } catch (err) {
      return serverError(context, err);
    }
  },
});
