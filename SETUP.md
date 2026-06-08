# AIOS — Installationsanleitung

**AIOS** (AI Management System) ist eine React/TypeScript Web App für KI-Governance.  
Diese Anleitung beschreibt den vollständigen Aufbau einer neuen Instanz von Null.

---

## Voraussetzungen

| Was | Warum |
|---|---|
| Azure-Subscription | SWA + App Registration |
| Microsoft 365 Tenant | SharePoint-Listen als Datenspeicher |
| GitHub-Account | Repository + CI/CD |
| Node.js 20+ | Lokale Entwicklung |
| PowerShell + PnP.PowerShell | SharePoint-Provisioning |

---

## Schritt 1 — Repository einrichten

```bash
# Option A: Fork des bestehenden Repos (empfohlen für Whitelabel)
# GitHub → paulbuero53cp-afk/AIOSWEB → Fork

# Option B: Template klonen
git clone https://github.com/paulbuero53cp-afk/AIOSWEB.git aios-[KUNDENNAME]
cd aios-[KUNDENNAME]
git remote set-url origin https://github.com/[DEIN-ORG]/aios-[KUNDENNAME].git
git push -u origin main
```

---

## Schritt 2 — Azure App Registration (Entra ID)

Im Azure Portal → **Entra ID → App-Registrierungen → Neu**

| Feld | Wert |
|---|---|
| Name | `AIOS-[Kundenname]` |
| Unterstützte Kontotypen | Nur dieser Mandant |
| Redirect URI | (leer lassen) |

**Nach der Erstellung:**

1. **API-Berechtigungen** → Berechtigung hinzufügen → Microsoft Graph → Anwendungsberechtigungen:
   - `Sites.ReadWrite.All`
   - `User.Read.All` *(optional, für Audit Trail)*

2. **Administratoreinwilligung erteilen** (Button oben)

3. **Zertifikate & Geheimnisse** → Neuer geheimer Clientschlüssel → Wert kopieren

**Notieren:**
```
AZURE_TENANT_ID     = <Verzeichnis-ID der Entra-Registrierung>
AZURE_CLIENT_ID     = <Anwendungs-ID>
AZURE_CLIENT_SECRET = <Geheimer Clientschlüssel>
```

---

## Schritt 3 — SharePoint-Site erstellen

1. Microsoft 365 Admin → SharePoint Admin Center → **Sites → Aktive Sites → Erstellen**
2. Typ: **Team-Site** (nicht Kommunikationssite)
3. Name: `AIOS` (oder `AIOS-[Kundenname]`)
4. URL: `https://[TENANT].sharepoint.com/sites/AIOS`

**Notieren:**
```
SHAREPOINT_SITE_URL = https://[TENANT].sharepoint.com/sites/AIOS
```

---

## Schritt 4 — SharePoint-Listen provisionieren

```powershell
# PnP.PowerShell installieren (einmalig)
Install-Module PnP.PowerShell -Scope CurrentUser

# Mit SharePoint verbinden
Connect-PnPOnline -Url "https://[TENANT].sharepoint.com/sites/AIOS" -Interactive

# Provisioning-Skript ausführen
.\scripts\Provision-SharePointLists.ps1
```

Erstellt folgende Listen:
- `AIOS_UseCases` — alle Use Cases inkl. Reliability-Felder
- `AIOS_Incidents` — Incident Log
- `AIOS_Artefakte` — Risk Assessments, Gate-Checklisten, Business Cases, DSFA
- `AIOS_AuditLog` — unveränderliches Audit-Protokoll
- `AIOS_Config` — Unternehmenskonfiguration (Name, Chatbot, etc.)

**⚠ Pflicht nach Provisioning (Bootstrap):**

Die Liste `AIOS_Users` ist zunächst leer. Die App erlaubt keinen Zugriff, solange kein Admin-Eintrag existiert.

1. SharePoint Admin Center → Site → `AIOS_Users` → **Neues Element**
2. Folgende Felder ausfüllen:

| Feld | Wert |
|---|---|
| `Email` | deine AAD-E-Mail-Adresse (z.B. admin@firma.de) |
| `DisplayName` | Dein Name |
| `Role` | `AIOS.Admin` |
| `Active` | `Ja` |
| `InvitedAt` | aktuelles Datum |
| `InvitedBy` | `system` |

3. Danach kannst du dich in der App anmelden → Admin-Bereich → **Benutzerverwaltung** → weitere Nutzer einladen.

**⚠ Pflicht nach Provisioning (Konfiguration):**
In der Liste `AIOS_Config` den Eintrag `COMPANY` mit den Kundendaten anpassen:
```json
{
  "name": "Unternehmensname",
  "short": "KÜRZEL",
  "tag": "AI Management System",
  "iso": "ISO 42001 aligned",
  "chatbot": { "enabled": false, "label": "", "url": "", "hint": "" }
}
```

---

## Schritt 5 — Azure Static Web App erstellen

Im Azure Portal → **Static Web Apps → Erstellen**

| Feld | Wert |
|---|---|
| Ressourcengruppe | neu oder bestehend |
| Name | `aios-[kundenname]` |
| Plan | Free (für Einzelmandant) |
| Region | West Europe |
| Quellcode | GitHub |
| Organisation | dein GitHub-Org |
| Repository | `aios-[kundenname]` |
| Branch | `main` |
| Build-Vorgaben | Benutzerdefiniert |
| App-Speicherort | `dist` |
| API-Speicherort | `api` |
| Ausgabespeicherort | *(leer)* |

→ **Erstellen** — Azure legt automatisch den GitHub Actions Workflow an und speichert `AZURE_STATIC_WEB_APPS_API_TOKEN` als Repository-Secret.

---

## Schritt 6 — GitHub Secrets konfigurieren

Im GitHub-Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Wert |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | *(wird von Azure automatisch gesetzt)* |
| `AZURE_TENANT_ID` | aus Schritt 2 |
| `AZURE_CLIENT_ID` | aus Schritt 2 |
| `AZURE_CLIENT_SECRET` | aus Schritt 2 |
| `SHAREPOINT_SITE_URL` | aus Schritt 3 |

---

## Schritt 7 — Ersten Deployment auslösen

```bash
git commit --allow-empty -m "chore: trigger initial deployment"
git push origin main
```

Build-Status: `https://github.com/[ORG]/[REPO]/actions`  
Dauer: ~3 Minuten

---

## Schritt 8 — Admin-Rolle zuweisen

Azure Portal → Static Web App → **Role Management → Invite**

| Feld | Wert |
|---|---|
| E-Mail | Admin-E-Mail-Adresse |
| Rolle | `AIOS.Admin` |

→ Einladungslink öffnen → bestätigen → Rolle ist aktiv.

**Verfügbare Rollen:**

| Rolle | Rechte |
|---|---|
| `AIOS.Viewer` | Lesen |
| `AIOS.Editor` | Lesen + Schreiben |
| `AIOS.Approver` | + Use Cases freigeben |
| `AIOS.Admin` | Vollzugriff + Konfiguration |

---

## Lokale Entwicklung

```bash
npm install
cp api/local.settings.json.example api/local.settings.json
# local.settings.json befüllen (siehe unten)
npm run dev
# → http://localhost:5173
```

**`api/local.settings.json`:**
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "USE_MOCK_DATA": "true",
    "AZURE_TENANT_ID": "...",
    "AZURE_CLIENT_ID": "...",
    "AZURE_CLIENT_SECRET": "...",
    "SHAREPOINT_SITE_URL": "https://[TENANT].sharepoint.com/sites/AIOS"
  }
}
```

`USE_MOCK_DATA=true` → 3 Beispiel-Use-Cases, kein SharePoint-Zugriff nötig.

---

## Checkliste Inbetriebnahme

```
[ ] Schritt 1: Repository erstellt
[ ] Schritt 2: App Registration angelegt, Berechtigungen erteilt
[ ] Schritt 3: SharePoint-Site erstellt
[ ] Schritt 4: Provisioning-Skript ausgeführt (6 Listen vorhanden)
[ ] Schritt 4: AIOS_Users → Ersten Admin-Eintrag manuell angelegt (Bootstrap)
[ ] Schritt 4: AIOS_Config → COMPANY-Eintrag angepasst
[ ] Schritt 5: Azure Static Web App erstellt
[ ] Schritt 6: 4 GitHub Secrets gesetzt
[ ] Schritt 7: Deployment erfolgreich (grüner Build)
[ ] Schritt 8: Admin-Rolle für mindestens einen User zugewiesen
[ ] Test: Login funktioniert
[ ] Test: Dashboard lädt (ggf. leere Listen — das ist normal)
[ ] Test: Neuer Use Case anlegen und speichern
```

---

## Troubleshooting

| Problem | Ursache | Fix |
|---|---|---|
| Build schlägt fehl | Fehlende Secrets | GitHub → Settings → Secrets prüfen |
| API gibt 401 zurück | Client Secret abgelaufen | Entra ID → neues Secret |
| SharePoint-Fehler | App hat keine `Sites.ReadWrite.All` Berechtigung | Entra ID → Admin Consent erteilen |
| Leere App nach Login | Provisioning nicht ausgeführt | Schritt 4 wiederholen |
| Keine Admin-Rechte im UI | Rolle nicht zugewiesen | Schritt 8 wiederholen |

---

## Manuelles Deployment (ohne CI/CD)

### Wann sinnvoll?

- Kein GitHub-Repository vorhanden (lokale Entwicklung / Whitelabel-Übergabe)
- GitHub Actions sind deaktiviert oder nicht konfiguriert
- Schneller Hotfix ohne Git-Push
- Einmalige Demo-Instanz ohne dauerhaften CI/CD-Aufwand

---

### Schritt-für-Schritt

#### 1. Deploy-Script ausführen

```powershell
# Im Projektverzeichnis (aios/)
.\scripts\Deploy-Manual.ps1
```

Das Script führt automatisch aus:
- `npm ci && npm run build` (Frontend, Vite/TypeScript)
- `staticwebapp.config.json` wird nach `dist/` kopiert
- `cd api && npm ci && npm run build && npm ci --omit=dev` (Azure Functions v4)
- Alles wird als ZIP auf dem Desktop abgelegt: `aios-deploy-YYYY-MM-DD.zip`

Nur packen ohne neu zu bauen (wenn `dist/` und `api/dist/` aktuell sind):

```powershell
.\scripts\Deploy-Manual.ps1 -SkipBuild
```

---

#### 2. Deployment-Token aus Azure Portal holen

Azure Portal → **Static Web Apps** → `[Deine App]` → **Übersicht**  
→ "Deployment-Token anzeigen" → kopieren

---

#### 3a. Deployen via `swa deploy` (empfohlen)

```powershell
npx swa deploy ./dist --api-location ./api --deployment-token <TOKEN>
```

Der SWA CLI (`@azure/static-web-apps-cli`) ist bereits als devDependency installiert.  
Alternativ global: `npm install -g @azure/static-web-apps-cli`

---

#### 3b. Alternativ: Azure Portal ZIP-Upload

Azure Portal → **Static Web Apps** → `[Deine App]` → Übersicht  
→ "ZIP-Datei hochladen" (Preview-Feature, nicht immer sichtbar)

> **Hinweis:** Option A (`swa deploy`) ist zuverlässiger und unterstützt auch die API-Location korrekt.

---

### Umgebungsvariablen (einmalig setzen)

Die folgenden Werte müssen **einmalig** in Azure konfiguriert werden — sie werden nicht im ZIP mitgeliefert:

Azure Portal → **Static Web Apps** → `[Deine App]` → **Konfiguration** → Anwendungseinstellungen:

| Variable | Wert |
|---|---|
| `AZURE_TENANT_ID` | Verzeichnis-ID aus Entra ID (Schritt 2) |
| `AZURE_CLIENT_ID` | Anwendungs-ID aus Entra ID (Schritt 2) |
| `AZURE_CLIENT_SECRET` | Geheimer Clientschlüssel (Schritt 2) |
| `SHAREPOINT_SITE_URL` | `https://[TENANT].sharepoint.com/sites/AIOS` |

→ **Speichern** → App wird automatisch neu gestartet.

> Diese Einstellungen bleiben bei jedem Deployment erhalten — nur einmalig nötig.
