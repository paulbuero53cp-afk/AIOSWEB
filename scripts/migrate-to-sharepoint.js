#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  AIOS — Datenmigrations-Script
//  AIOS HTML v4 → SharePoint Lists via Microsoft Graph API
//
//  Voraussetzung:
//    npm install @azure/identity @microsoft/microsoft-graph-client csv-parse
//
//  Konfiguration via .env:
//    AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
//    SHAREPOINT_SITE_URL
//
//  Ausführung:
//    node migrate-to-sharepoint.js --uc usecases.csv --art artefakte.json [--dry-run]
// ─────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'fs';
import { parse }  from 'csv-parse/sync';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider }
  from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';

// ── CLI Args ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const DRY_RUN  = args.includes('--dry-run');
const UC_FILE  = getArg('--uc')  ?? 'usecases.csv';
const ART_FILE = getArg('--art') ?? 'artefakte.json';

console.log(`\n🚀 AIOS Migrations-Script${DRY_RUN ? ' [DRY-RUN]' : ''}\n`);

// ── Konfiguration ─────────────────────────────────────────────
const TENANT_ID     = process.env.AZURE_TENANT_ID;
const CLIENT_ID     = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SITE_URL      = process.env.SHAREPOINT_SITE_URL;

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SITE_URL) {
  console.error('❌ Fehlende ENV-Variable. Bitte setzen: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, SHAREPOINT_SITE_URL');
  process.exit(1);
}

// ── Graph Client ──────────────────────────────────────────────
const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});
const client = Client.initWithMiddleware({ authProvider });

// ── Site-ID ermitteln ─────────────────────────────────────────
async function getSiteId() {
  const url      = new URL(SITE_URL);
  const hostname = url.hostname;
  const sitePath = url.pathname;
  const result   = await client.api(`/sites/${hostname}:${sitePath}`).select('id').get();
  console.log(`✓ Site-ID: ${result.id}`);
  return result.id;
}

// ── Item erstellen ────────────────────────────────────────────
async function createItem(siteId, listName, fields) {
  if (DRY_RUN) {
    console.log(`  [DRY] ${listName}: ${JSON.stringify(fields).slice(0, 80)}…`);
    return { id: 'dry-' + Math.random().toString(36).slice(2) };
  }
  return client.api(`/sites/${siteId}/lists/${listName}/items`).post({ fields });
}

// ── UC-Migration ──────────────────────────────────────────────
function parseKiType(kitEinsatz, kitErstellung) {
  const vals = [];
  if (kitEinsatz === '1' || kitEinsatz === 1) vals.push('KI im Einsatz');
  if (kitErstellung === '1' || kitErstellung === 1) vals.push('KI in der Erstellung');
  return { values: vals.map(v => ({ value: v })) };
}

function parseBool(v) { return v === '1' || v === 1 || v === true; }

async function migrateUseCases(siteId, ucFile) {
  if (!existsSync(ucFile)) { console.log(`⚠  ${ucFile} nicht gefunden — UC-Migration übersprungen`); return 0; }

  const raw  = readFileSync(ucFile, 'utf-8').replace(/^\uFEFF/, ''); // BOM entfernen
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  console.log(`\n📋 Use Cases: ${rows.length} Einträge`);

  let ok = 0, err = 0;
  for (const row of rows) {
    try {
      const fields = {
        Title:       row.title || row.Title || '—',
        UCId:        row.id,
        Cluster:     row.cl,
        System:      row.sys,
        Legacy:      row.legacy ?? '',
        Owner:       row.own,
        Capability:  row.cap,
        KiType:      parseKiType(row.kit_einsatz, row.kit_erstellung),
        Autonomy:    row.auto,
        Lifecycle:   row.lc,
        Portfolio:   row.pd,
        RiskTier:    row.rt,
        GovTier:     row.tier,
        Approval:    row.app,
        OpReady:     row.or,
        KpiStatus:   row.kpi,
        HiTL:        row.hitl,
        Reversible:  row.rev,
        ValueScore:  Number(row.vs) || 1,
        FeasScore:   Number(row.fs) || 1,
        RiskScore:   Number(row.rs) || 1,
        Active:      parseBool(row.act),
        Description: row.desc ?? '',
        Link:        row.link ?? '',
        CreatedBy_x: row.createdBy ?? '',
        UpdatedBy_x: row.updatedBy ?? '',
        GT01: parseBool(row.gt0), GT02: parseBool(row.gt1),
        GT03: parseBool(row.gt2), GT04: parseBool(row.gt3),
        SB01: parseBool(row.sb0), SB02: parseBool(row.sb1),
        SB03: parseBool(row.sb2), SB04: parseBool(row.sb3),
        MC01: parseBool(row.mc0), MC02: parseBool(row.mc1),
        MC03: parseBool(row.mc2), MC04: parseBool(row.mc3),
        MC05: parseBool(row.mc4), MC06: parseBool(row.mc5),
        MC07: parseBool(row.mc6),
      };
      await createItem(siteId, 'AIOS_UseCases', fields);
      process.stdout.write('.');
      ok++;
    } catch (e) {
      console.error(`\n  ❌ ${row.id}: ${e.message}`);
      err++;
    }
  }
  console.log(`\n  ✓ ${ok} migriert, ${err} Fehler`);
  return ok;
}

// ── Artefakte-Migration ───────────────────────────────────────
async function migrateArtefakte(siteId, artFile) {
  if (!existsSync(artFile)) { console.log(`⚠  ${artFile} nicht gefunden — Artefakte-Migration übersprungen`); return 0; }

  const artDB = JSON.parse(readFileSync(artFile, 'utf-8'));
  const types = ['ra', 'gc', 'bc', 'dsfa'];
  let ok = 0, err = 0;

  console.log(`\n📄 Artefakte: ${types.map(t => `${t}=${Object.keys(artDB[t] ?? {}).length}`).join(', ')}`);

  for (const type of types) {
    const entries = Object.entries(artDB[type] ?? {});
    for (const [ucId, payload] of entries) {
      try {
        const fields = {
          Title:   `${ucId}-${type}`,
          UCId:    ucId,
          ArtType: type,
          Payload: JSON.stringify(payload),
          SavedAt: new Date().toISOString(),
          SavedBy: 'migration-script',
        };
        await createItem(siteId, 'AIOS_Artefakte', fields);
        process.stdout.write('.');
        ok++;
      } catch (e) {
        console.error(`\n  ❌ ${ucId}/${type}: ${e.message}`);
        err++;
      }
    }
  }
  console.log(`\n  ✓ ${ok} migriert, ${err} Fehler`);
  return ok;
}

// ── Validierung nach Migration ────────────────────────────────
async function validate(siteId) {
  if (DRY_RUN) { console.log('\n[DRY-RUN] Validierung übersprungen'); return; }
  console.log('\n🔍 Validierung…');

  const ucItems  = await client.api(`/sites/${siteId}/lists/AIOS_UseCases/items?$top=999`).get();
  const artItems = await client.api(`/sites/${siteId}/lists/AIOS_Artefakte/items?$top=999`).get();

  console.log(`  Use Cases in SharePoint: ${ucItems.value?.length ?? 0}`);
  console.log(`  Artefakte in SharePoint: ${artItems.value?.length ?? 0}`);
}

// ── Main ──────────────────────────────────────────────────────
(async () => {
  try {
    const siteId = await getSiteId();
    await migrateUseCases(siteId, UC_FILE);
    await migrateArtefakte(siteId, ART_FILE);
    await validate(siteId);
    console.log('\n✅ Migration abgeschlossen\n');
  } catch (e) {
    console.error('\n❌ Fataler Fehler:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
