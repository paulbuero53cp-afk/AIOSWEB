// ─────────────────────────────────────────────────────────────
//  AIOS — /api/catalog  (öffentlich, kein Auth)
//
//  GET /api/catalog
//  Gibt nur produktive, genehmigte, operational-ready Use Cases zurück.
//  Keine Scores, keine Governance-Felder — nur öffentlich sinnvolle Infos.
// ─────────────────────────────────────────────────────────────

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { listItems } from '../lib/storage';
import { spToUC } from '../lib/mappers';
import { serverError } from '../lib/http';

const MOCK_AGENTS = [
  {
    id: 'UC-2025-01-001', title: 'Reisekostenabrechnung Assistent',
    cl: 'Finance', sys: 'M365 Copilot', own: 'Maria Schmidt', cap: 'Generative KI',
    desc: 'KI-gestützte Unterstützung bei der Erfassung und Prüfung von Reisekostenabrechnungen.',
    link: '', useCaseCategory: 'Copilot Agents',
  },
  {
    id: 'UC-2025-01-002', title: 'HR-Onboarding Guide',
    cl: 'HR', sys: 'Copilot Studio', own: 'Thomas Bauer', cap: 'Generative KI',
    desc: 'Automatisierter Onboarding-Assistent für neue Mitarbeiterinnen und Mitarbeiter.',
    link: 'https://example.com', useCaseCategory: 'Copilot Agents',
  },
];

async function handleGet(): Promise<HttpResponseInit> {
  if (process.env['USE_MOCK_DATA'] === 'true') {
    return { status: 200, jsonBody: MOCK_AGENTS };
  }

  const items = await listItems('USECASES');
  const agents = items
    .map(item => spToUC(item.id, item.fields as Record<string, unknown>))
    .filter(uc =>
      uc.act &&
      uc.lc === 'Run' &&
      uc.app === 'Approved' &&
      uc.or === 'Operational Ready',
    )
    .map(uc => ({
      id:              uc.id,
      title:           uc.title,
      cl:              uc.cl,
      sys:             uc.sys,
      own:             uc.own,
      cap:             uc.cap,
      desc:            uc.desc,
      link:            uc.link,
      useCaseCategory: uc.useCaseCategory,
    }));

  return { status: 200, jsonBody: agents };
}

app.http('catalog', {
  methods: ['GET'],
  route: 'catalog',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    ctx.log('GET /api/catalog');
    try {
      return await handleGet();
    } catch (err) {
      return serverError(ctx, err);
    }
  },
});
