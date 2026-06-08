# AIOS — Tenant-Rollout-Checkliste (Option A: manuell, 1–2 Tenants)

Produktives Deployment in einen **Ziel-Tenant** (Kunde/Partner).
Architektur unverändert: Azure SWA + Azure Functions + SharePoint Lists + Entra ID (**Same-Tenant-Auth, Tenant-Lock**).

**Aufwand:** ~2 h pro Tenant · **Rollen:** M365-/Entra-Admin (A) + Deployer (D)

---

## Platzhalter (vorab ausfüllen)

| Platzhalter | Wert für diesen Tenant |
|---|---|
| `<TENANT_ID>` | _________ (Verzeichnis-/Mandanten-ID) |
| `<TENANT_HOST>` | z. B. `kundefirma123` (→ `kundefirma123.sharepoint.com`) |
| `<CLIENT_ID>` | _________ (nach Schritt 1) |
| `<CLIENT_SECRET>` | _________ (nach Schritt 1, geheim) |
| `<SWA_HOSTNAME>` | _________ (nach Schritt 2, z. B. `aios-kunde.azurestaticapps.net`) |
| `<COMPANY_NAME>` | _________ (Anzeigename des Kunden) |

---

## Schritt 1 — App-Registrierung im Ziel-Tenant  · (A)

1. Entra ID → **App-Registrierungen → Neue Registrierung** → Name `AIOS`
2. **Unterstützte Kontotypen:** _Nur Konten in diesem Organisationsverzeichnis_ (Single-Tenant)
3. **API-Berechtigungen** (Application, nicht Delegated): Microsoft Graph → `Sites.ReadWrite.All` → **Admin-Consent erteilen**
4. **Zertifikate & Geheimnisse → Neuer geheimer Clientschlüssel** → Wert = `<CLIENT_SECRET>`
5. **Authentifizierung → Plattform Web → Redirect-URI:** `https://<SWA_HOSTNAME>/.auth/login/aad/callback`
   _(SWA-Hostname erst nach Schritt 2 bekannt → hier zurückkommen)_
6. Notieren: **Anwendungs-ID** = `<CLIENT_ID>`, **Verzeichnis-ID** = `<TENANT_ID>`

## Schritt 2 — Azure SWA deployen  · (D)

1. Build: `npm run build` (Root `aios/`, erzeugt `dist/` + `api/`)
2. Neue **Static Web App** (Plan **Standard** — Custom-Auth braucht Standard, Free reicht nicht)
3. Deploy via GitHub Actions (`.github/workflows/azure-static-web-apps.yml`) **oder** `swa deploy`
4. **SWA-Hostname** = `<SWA_HOSTNAME>` notieren → **zurück zu Schritt 1.5** (Redirect-URI eintragen)

## Schritt 3 — SWA Auth konfigurieren (Tenant-Lock)  · (D)

`staticwebapp.config.json` um einen `auth`-Block ergänzen — **lockt Login auf den Ziel-Tenant**:

```json
"auth": {
  "identityProviders": {
    "azureActiveDirectory": {
      "registration": {
        "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
        "clientIdSettingName": "AAD_CLIENT_ID",
        "clientSecretSettingName": "AAD_CLIENT_SECRET"
      }
    }
  }
}
```

- `openIdIssuer` mit konkreter `<TENANT_ID>` ⇒ nur Nutzer dieses Tenants können sich anmelden.
- Provider-Alias bleibt `aad` → bestehende `responseOverrides`/Routes (`/.auth/login/aad`) unverändert gültig.

> ⚠️ **Pflicht-Edit (deployed):** `content-security-policy → frame-ancestors`
> von `https://handsonaiowl771.sharepoint.com` auf `https://<TENANT_HOST>.sharepoint.com` ändern.
> _Datei: `staticwebapp.config.json:23` — einziger hardcodeter Tenant-Wert im Build._

## Schritt 4 — SharePoint Site + Lists anlegen  · (A)

1. SharePoint Admin Center → **Aktive Sites → Erstellen** → URL `https://<TENANT_HOST>.sharepoint.com/sites/AIOS`
2. Lists provisionieren (lokal mit Tenant-Credentials in `api/local.settings.json`):
   ```powershell
   Connect-PnPOnline -Url "https://<TENANT_HOST>.sharepoint.com/sites/AIOS" -Interactive
   .\scripts\Provision-SharePointLists.ps1 -CompanyName "<COMPANY_NAME>"   # 6 Listen + Spalten + seedet COMPANY
   # alternativ (Graph statt PnP): node scripts/provision-sharepoint.mjs
   ```
3. Mindestens **einen Admin-User** in `AIOS_Users` anlegen (Bootstrap — sonst ist niemand Admin).
   Siehe `SETUP.md` Schritt 5.
4. **`AIOS_Config` → COMPANY** ist durch `-CompanyName` bereits geseedet. Falls leer/abweichend:
   in der App unter *Info* setzen. _Fallback ohne Eintrag ist tenant-neutral `'AIOS'`._

## Schritt 5 — Azure Functions App Settings  · (D)

In der SWA → **Konfiguration → Anwendungseinstellungen** (oder GitHub Secrets für CI):

| Setting | Wert |
|---|---|
| `AZURE_TENANT_ID` | `<TENANT_ID>` |
| `AZURE_CLIENT_ID` | `<CLIENT_ID>` |
| `AZURE_CLIENT_SECRET` | `<CLIENT_SECRET>` |
| `SHAREPOINT_SITE_URL` | `https://<TENANT_HOST>.sharepoint.com/sites/AIOS` |
| `AAD_CLIENT_ID` | `<CLIENT_ID>`  _(für Auth-Block aus Schritt 3)_ |
| `AAD_CLIENT_SECRET` | `<CLIENT_SECRET>` |
| `USE_MOCK_DATA` | `false` |
| `USE_LOCAL_DB` | `false` |

## Schritt 6 — Redirect-URIs + Verifikation  · (A + D)

1. **Schritt 1.5 prüfen:** Redirect-URI `https://<SWA_HOSTNAME>/.auth/login/aad/callback` ist eingetragen.
2. CORS: SWA serviert Front + `/api` same-origin → i. d. R. **kein** zusätzlicher CORS-Eintrag nötig
   (CSP `connect-src 'self'`). Nur falls Custom Domain → dort auch Redirect-URI ergänzen.
3. **Smoke-Test:**
   - [ ] Login mit Tenant-Nutzer → erfolgreich; fremder Tenant → **abgewiesen** (Tenant-Lock ok)
   - [ ] Dashboard lädt echte `AIOS_UseCases`-Daten aus SharePoint
   - [ ] CRUD (anlegen/ändern/löschen) funktioniert → schreibt in SharePoint
   - [ ] Admin-User sieht Admin-Funktionen; Standard-User nur Viewer
   - [ ] Kein CSP-Fehler in der Browser-Konsole

---

## Hardcoded-Tenant-Werte — Referenz (aus Code-Config-Check)

| Stelle | Im Deploy? | Pflicht pro Tenant? |
|---|---|---|
| `staticwebapp.config.json:23` — `frame-ancestors …handsonaiowl771…` | ✅ ja | **Ja** (Schritt 3) — einziger Pflicht-Edit |
| `api/src/functions/config.ts:31` — Fallback `name` | ✅ ja | Nein — jetzt tenant-neutral `'AIOS'` ✅ bereinigt |
| `scripts/Provision-SharePointLists.ps1` — COMPANY-Seed | Provisioning | Nein — jetzt `-CompanyName`-Parameter ✅ bereinigt |
| `scripts/check-columns.mjs:19` — Dev-Diagnose | ❌ nur Dev | Nein — leitet jetzt aus `SHAREPOINT_SITE_URL` ab ✅ bereinigt |
| Chatbot-Default `https://claude.ai` | Default | Nein, in-App editierbar (Info-Screen) |

**Alle echten Auth-/Graph-/Site-Werte** kommen aus App Settings — kein Code-Refactoring nötig.
Nach Cleanup ist `frame-ancestors` (Schritt 3) der **einzige** verbleibende Per-Tenant-Edit im Build.

---

## Ab 3+ Tenants → Option B
Wiederkehrende Schritte 1–6 in **Bicep + PowerShell** gießen (App-Reg via `az ad app create`,
SWA via Bicep, Settings via `az staticwebapp appsettings set`, Lists via vorhandenes `provision-sharepoint.mjs`).
Diese Checkliste ist die Spezifikation dafür.
