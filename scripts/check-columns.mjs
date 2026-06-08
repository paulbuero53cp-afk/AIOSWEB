// Prüft ob GT01, SB01, MC01 in AIOS_UseCases existieren
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const settings = JSON.parse(
  readFileSync(join(__dir, '../api/local.settings.json'), 'utf8')
).Values;

const { AZURE_TENANT_ID: tid, AZURE_CLIENT_ID: cid, AZURE_CLIENT_SECRET: secret, SHAREPOINT_SITE_URL: siteUrl } = settings;

if (!siteUrl) { console.log('SHAREPOINT_SITE_URL fehlt in local.settings.json'); process.exit(1); }
const { hostname: spHost, pathname: spPath } = new URL(siteUrl);  // z.B. tenant.sharepoint.com + /sites/AIOS

const tokenRes = await fetch(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/token`, {
  method: 'POST',
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cid, client_secret: secret, scope: 'https://graph.microsoft.com/.default' }),
});
const { access_token: token } = await tokenRes.json();

const siteRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${spHost}:${spPath}?$select=id`, { headers: { Authorization: `Bearer ${token}` } });
const { id: siteId } = await siteRes.json();

// Alle Listen holen
const listsRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists?$select=id,name&$top=50`, { headers: { Authorization: `Bearer ${token}` } });
const lists = await listsRes.json();
const ucList = lists.value.find(l => l.name === 'AIOS_UseCases');
if (!ucList) { console.log('AIOS_UseCases nicht gefunden!'); process.exit(1); }

console.log(`AIOS_UseCases ID: ${ucList.id}`);

// Alle Spalten holen
const colsRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${ucList.id}/columns?$select=name,displayName,hidden&$top=500`, { headers: { Authorization: `Bearer ${token}` } });
const cols = await colsRes.json();

// Alle nicht-versteckten Spalten zeigen
console.log('\nAlle sichtbaren Spalten (intern → Anzeigename):');
for (const c of (cols.value ?? []).filter(c => !c.hidden).sort((a,b) => a.name.localeCompare(b.name))) {
  console.log(`  ${c.name.padEnd(25)} → ${c.displayName}`);
}

const check = ['GT01','GT02','GT03','GT04','SB01','SB02','SB03','SB04','MC01','MC02','MC03','MC04','MC05','MC06','MC07','ReliabilityTier','HitlMode','AutonomyLevel','FailureModes','MonitoringSla'];
console.log('\nGesuchte Spalten:');
for (const name of check) {
  const found = cols.value?.find(c => c.name === name);
  console.log(`  ${found ? '✓' : '✗'} ${name}${found ? ` (${found.displayName})` : ' — FEHLT'}`);
}
