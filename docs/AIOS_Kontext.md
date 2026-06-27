# AIOS — KI-Governance Web App · Kontext-Dokument
**Stand: Juni 2026** · Für Session-Übergabe und Onboarding

---

## 1. Projektübersicht

React/TypeScript SPA für KI-Governance in Unternehmen. Verwaltung von KI-Use-Cases nach EU AI Act und internen Anforderungen. Whitelabel-fähig für KMU-Integratoren und Reseller.

**Live-URL:** https://gray-cliff-0220e3b10.7.azurestaticapps.net  
**GitHub:** https://github.com/paulbuero53cp-afk/AIOSWEB  
**SharePoint:** https://handsonaiowl771.sharepoint.com/sites/AIOS  
**Arbeitsverzeichnis:** `C:\Users\paulm\OneDrive\CLA_Projects\projects\AIOSWebApp_FINAL\aios\`

---

## 2. Stack & Azure-Ressourcen

| Komponente | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite → Azure Static Web Apps |
| Backend | Azure Functions v4, Node.js 20, TypeScript |
| Auth | SWA EasyAuth (`/.auth/login/aad`) |
| Daten | SharePoint Lists via Microsoft Graph API |
| CI/CD | Azure DevOps Pipeline → push auf `main` triggert Deploy |
| Hosting | Free SKU (Demo) / Standard SKU (Produktion) |

| Azure-Ressource | Wert |
|---|---|
| Tenant ID | `73971f7b-211f-4ac6-a4b9-e16c4f9fd920` |
| Client ID | `21ccdf12-06e9-40f6-99e2-d77784a7a285` |
| Resource Group | `AIOS_group` |
| Subscription ID | `92a27a24-7f01-4c83-93da-234a762fab7a` |

---

## 3. Architektur-Kernpunkte

### Rollenmodell
**Einzige Autorität: SharePoint-Liste `AIOS_Users`** — SWA Free SKU überträgt keine Custom Roles.  
`resolveEffectiveRole()` in `api/src/lib/auth.ts` liest SP-Liste, nicht `userRoles`.

| Rolle | Rechte |
|---|---|
| `AIOS.Viewer` | Lesen (UCs, Status, Berichte) |
| `AIOS.Editor` | + Erstellen/Bearbeiten UCs + Artefakte speichern |
| `AIOS.Approver` | + UC Freigeben (app-Feld) |
| `AIOS.Admin` | + Benutzerverwaltung, Config, Datenaustausch |

- `requireUser()` = jeder Eingeladene (Viewer+) → nicht Eingeladene → 403 + Fehlerscreen
- `requireRole([...])` ist **async**, prüft SP-Liste
- **Fail-closed:** kein `AIOS_Users`-Eintrag = kein Zugriff (kein Bootstrap in Prod)
- Artefakt-Inhalte inkl. DSFA: nur **Editor+** (Security Finding F10)

### Functions-Registry (KRITISCH)
Jede neue Datei in `api/src/functions/` **muss** in `api/src/index.ts` importiert werden.  
Fehlt der Import → stiller 404, kein Build-Fehler.

```ts
import './functions/usecases';
import './functions/incidents';
import './functions/artefakte';
import './functions/auditlog';
import './functions/config';
import './functions/users';
import './functions/aitools';
import './functions/exchange';   // neu: Datenaustausch
```

---

## 4. SharePoint-Listen

| Key | SP-Listenname | Inhalt |
|---|---|---|
| `USECASES` | `AIOS_Usecases` | Use Cases inkl. Scores, Trigger, Reliability |
| `INCIDENTS` | `AIOS_Incidents` | KI-Vorfälle |
| `ARTEFAKTE` | `AIOS_Artefakte` | Artefakt-Payloads (JSON), 1 Item pro UC+Typ |
| `AUDITLOG` | `AIOS_AuditLog` | Audit-Einträge mit Diff |
| `CONFIG` | `AIOS_Config` | App-Konfiguration (Firmenname, Chatbot) |
| `USERS` | `AIOS_Users` | Eingeladene Benutzer + Rollen — **einzige Rollenautorität** |
| `AITOOLS` | `AIOS_AiTools` | Register erlaubter KI-Tools |

---

## 5. Datenmodell

### UseCase (wichtigste Felder)
```ts
interface UseCase {
  id: string;            // UC-YYYY-MM-NNN (serverseitig generiert)
  title: string;
  lc: 'Idea'|'Build'|'Run'|'Retire';
  pd: 'Start'|'Scale'|'Stop'|'Hold'|'Backlog';
  rt: 'Low'|'Medium'|'High';
  tier: '1'|'2'|'3';    // Governance-Tier
  app: 'Not required'|'Pending'|'Approved'|'Rejected';
  vs: number; fs: number; rs: number;  // Scores 1-3
  gt: boolean[4];        // Governance-Trigger GT01-GT04
  sb: boolean[4];        // Sensitive Bereiche SB01-SB04
  mc: boolean[7];        // Minimum Checks MC01-MC07
  act: boolean;          // Soft-Delete
  rl?: 'R1'|'R2'|'R3'|'R4'|'R5';   // Reliability-Tier
  hitlMode?: 'HITL'|'HOTL'|'none';
  autonomyLevel?: 'supervised'|'semi-auto'|'autonomous';
  failureModes?: string[];
}
```

### Artefakte (Payload als JSON in SP gespeichert)
| ArtType | Inhalt |
|---|---|
| `ra` | Risk Assessment: 7 Dim. (1-3) + EU AI Act eu1-eu7 + Mitigation m1-m7 |
| `gc` | Gate Checks: A (a1-a9), B (b1-b10), C (c1-c10), Reliability rl1-rl5, Agentic rl6-rl8 |
| `bc` | Business Case: Lohnkosten, Nutzen (i_*), Kosten (c_*), narrative |
| `dsfa` | DSFA/DPIA: bg_* (Hintergrund/Trigger), dt1-dt6 (Art.35), ds_* (Beschreibung), dr1-dr6 (Risiken), Maßnahmen |

---

## 6. API-Endpunkte

### Use Cases
| Route | Methode | Rolle | Beschreibung |
|---|---|---|---|
| `/api/usecases` | GET | User+ | Alle aktiven UCs |
| `/api/usecases/{id}` | GET | User+ | Einzelner UC |
| `/api/usecases` | POST | Editor+ | Neu anlegen (ID auto-generiert) |
| `/api/usecases/{id}` | PATCH | Editor+ (app: Approver+) | Update + Audit |
| `/api/usecases/{id}` | DELETE | Admin | Soft/Hard-Delete |

### Artefakte
| Route | Methode | Rolle | Beschreibung |
|---|---|---|---|
| `/api/artefakte/{type}/{ucId}` | GET | Editor+ | Einzelartefakt (ra/gc/bc/dsfa) |
| `/api/artefakte/{type}/{ucId}` | POST | Editor+ | Speichern (upsert) |
| `/api/artefakte/all/{ucId}` | GET | Editor+ | Alle 4 Typen für einen UC |
| `/api/artefakte/status` | GET | User+ | `{[ucId]: ['ra','gc',...]}` |
| `/api/artefakte/export` | GET | Admin | Vollexport aller Artefakte |

### Datenaustausch (neu, Juni 2026)
| Route | Methode | Rolle | Beschreibung |
|---|---|---|---|
| `/api/exchange/export` | POST | Admin | Bundle exportieren. Body: `{ucIds?: string[]}` |
| `/api/exchange/import` | POST | Admin | Bundle importieren (upsert by UCId) |

### Weitere
| Route | Methode | Rolle |
|---|---|---|
| `/api/incidents[/{id}]` | GET/POST/PATCH | User+/Editor+ |
| `/api/auditlog` | GET | Admin |
| `/api/config` | GET/POST | User+/Admin |
| `/api/users/me` | GET | Auth |
| `/api/users[/{id}]` | GET/POST/PATCH/DELETE | Admin |
| `/api/aitools[/{id}]` | GET/POST/PATCH/DELETE | User+/Editor+ |

---

## 7. Datenaustausch — Bundle-Format

```json
{
  "exportVersion": "1.0",
  "exportedAt": "2026-06-27T...",
  "source": "AIOS",
  "count": 5,
  "useCases": [
    {
      "useCase": { ...alle UseCase-Felder... },
      "artefakte": { "ra": {...}, "gc": {...}, "bc": {...}, "dsfa": {...} }
    }
  ]
}
```

**Import-Logik:** Upsert by UCId — existierend=update, neu=create mit Original-ID.  
Artefakte analog. Alle Operationen im Audit Log (`action: 'import'`).  
Fehler einzelner UCs brechen den Gesamtimport nicht ab (`errors[]` in Response).

**Frontend:**
- Bulk: `Info & Konfiguration` → Karte „Datenaustausch" (Admin-only)
- Einzel: UC-Detail-Modal → Button „⬇ Export" im Footer (Admin-only)

---

## 8. i18n (DE/EN)

Zwei Mechanismen, beide in `src/context/LanguageContext.tsx`:

```ts
// Key-basiert — für Standard-UI-Strings
const { t } = useLang();
t('nav.dashboard')           // → 'Dashboard'
t('usr.created', { email })  // → interpoliert

// Text-basiert — für Inline-Strings, DSFA, SP-Enums
const tx = useTx();
tx('Erlaubt')                // DE → 'Erlaubt', EN → 'Allowed'
tx('DSFA benötigt')          // DE → 'DSFA benötigt', EN → 'DPIA required'

// Sprache
const { lang, toggle } = useLang(); // 'de'|'en', localStorage 'aios.lang'
```

**ACHTUNG Namenskollision:** In `map(t => ...)` den Parameter umbenennen (`tool`, `uc` etc.), da `t` = Übersetzungsfunktion.

**tx() ist fail-soft:** Kein Eintrag → gibt deutschen Quelltext zurück.

**Neue Strings:**
- Key-basiert: Eintrag in `de`- und `en`-Dict in `src/lib/i18n.ts`
- Text-basiert: Eintrag in `byTextEn`-Map in `src/lib/i18n.ts`

---

## 9. Screens (alle 19, vollständig deployed)

| Screen | Datei | Funktion |
|---|---|---|
| Dashboard | `Dashboard.tsx` | Governance-KPIs, UC-Status-Übersicht |
| Portfolio Board | `Portfolio.tsx` | Kanban + Bubble Chart (Value vs. Risk) |
| KI-Strategie | `AiStrategy.tsx` | Strategischer Rahmen |
| Use Cases | `UseCases.tsx` | Liste, Filter, Suche, CRUD |
| UC Detail/Edit | `EditModal.tsx` + `UcForm.tsx` | View (Metriken, Artefakt-Kacheln, Export) + Edit (4 Tabs) |
| Governance Cockpit | `Governance.tsx` | Aggregierte Compliance-Übersicht |
| Incident Log | `IncidentLog.tsx` | Vorfälle erfassen und verwalten |
| AI Agent Hub | `AgentHub.tsx` | R3+ Kontrollen-Ampel, Agentic Controls |
| Dokumentations-Hub | `ArtefaktHub.tsx` | Artefakt-Übersicht, CSV/JSON/Excel-Export |
| Risk Assessment | `RiskAssessment.tsx` | 7 Dim. + EU AI Act Anhang III |
| Gate-Checklisten | `GateChecks.tsx` | Gate A/B/C + Reliability + Agentic |
| Business Case | `BusinessCase.tsx` | ROI-Kalkulator, Payback-Period |
| DSFA/DPIA | `Dsfa.tsx` | ~90 Fragen, 4 Schritte, Art.35 DSGVO |
| Audit Log | `AuditLog.tsx` | Alle Aktionen mit Diff, unveränderlich |
| Info & Konfiguration | `Info.tsx` | App-Info, Config (Admin), Datenaustausch (Admin) |
| UC Dashboard | `UcDashboard.tsx` | One-Pager, druckoptimiert |
| Benutzerverwaltung | `Users.tsx` | Einladen, Rollen, Sperren |
| AI-Tools Register | `AiTools.tsx` | Erlaubte Tools, Freigabe-Workflow |
| Berichte | `Reports.tsx` | Management / EU AI Act / Reliability als CSV/Excel |

---

## 10. Wichtige Dateipfade

```
aios/
├── src/
│   ├── lib/
│   │   ├── i18n.ts                    ← DE/EN-Wörterbuch + translate()
│   │   ├── api.ts                     ← ucApi, artApi, exchangeApi, aiToolApi, ...
│   │   └── exports.ts                 ← CSV/JSON/Excel/Print/Bundle-Funktionen
│   ├── context/
│   │   ├── LanguageContext.tsx        ← t(), tx(), useLang(), useTx()
│   │   ├── AuthContext.tsx            ← isAdmin, isApprover, isEditor, aiosUser
│   │   └── ToastContext.tsx
│   ├── types/index.ts                 ← alle TypeScript-Typen
│   └── components/screens/            ← alle 19 Screens
├── styles/global.css                  ← Stockmeier-Theme (--accent, --petrol, ...)
├── api/
│   ├── src/
│   │   ├── index.ts                   ← ⚠️ Function-Registry (alle imports hier!)
│   │   ├── lib/
│   │   │   ├── auth.ts                ← requireRole(), requireUser(), resolveEffectiveRole()
│   │   │   ├── mappers.ts             ← SP-Felder ↔ TypeScript bidirektional
│   │   │   ├── sharepoint.ts          ← listItems(), findItem(), createItem(), updateItem()
│   │   │   └── audit.ts               ← writeAuditLog(), AuditAction-Typ
│   │   └── functions/
│   │       ├── usecases.ts
│   │       ├── incidents.ts
│   │       ├── artefakte.ts
│   │       ├── exchange.ts            ← Datenaustausch (neu)
│   │       ├── users.ts
│   │       ├── aitools.ts
│   │       ├── auditlog.ts
│   │       └── config.ts
├── staticwebapp.config.json           ← CSP frame-ancestors (pro Tenant!)
├── azure-pipelines.yml                ← CI/CD (trigger: push → main)
├── docs/
│   ├── AIOS_Kontext.md                ← diese Datei
│   ├── AIOS_Projektdokumentation_2026-06.docx
│   ├── Tenant-Rollout-Checkliste.md
│   └── security-review-2026-06-08.md
└── scripts/
    ├── provision-sharepoint.mjs       ← SP-Listen anlegen (Node.js)
    └── Provision-SharePointLists.ps1  ← SP-Listen anlegen (PowerShell/PnP)
```

---

## 11. Deployment

### CI/CD Pipeline (`azure-pipelines.yml`)
Trigger: `git push origin main` → Azure DevOps startet automatisch.

```
1. Node.js 20.x installieren
2. Frontend: npm install && npm run build  →  dist/
3. cp staticwebapp.config.json dist/
4. API: npm install && npm run build
5. API: npm install --omit=dev
6. AzureStaticWebApp@0: Deploy (app_location: dist, api_location: api)
```

### Pflicht-Variablen (Azure DevOps)
| Variable | Inhalt |
|---|---|
| `DEPLOYMENT_TOKEN` | SWA Deployment Token |
| `AZURE_TENANT_ID` | AAD Tenant ID |
| `AZURE_CLIENT_ID` | App Registration Client ID |
| `AZURE_CLIENT_SECRET` | Client Secret |
| `SHAREPOINT_SITE_URL` | `https://{tenant}.sharepoint.com/sites/AIOS` |

### Multi-Tenant
Einzige Änderung pro Tenant: `staticwebapp.config.json` → `frame-ancestors https://KUNDE.sharepoint.com`  
Firmenname: SP-Liste `AIOS_Config` — kein Rebuild nötig.  
Prod: Standard SKU + `openIdIssuer` mit Tenant-ID für Tenant-Lock.

### ⚠️ Sicherheit Produktion
- `AIOS_DEV_AUTH` darf **nicht** gesetzt sein (Auth-Backdoor)
- `AIOS_BOOTSTRAP` darf **nicht** gesetzt sein (jeder Tenant-User = Viewer)
- `USE_MOCK_DATA` muss `false` oder nicht gesetzt sein

---

## 12. Lokale Entwicklung

```bash
# Frontend (Mock-Auth als AIOS.Admin, Mock-Daten)
cd aios && npm run dev
# → http://localhost:5173

# Build prüfen
npm run build          # Frontend
cd api && npm run build  # Azure Functions

# Deployment auslösen
git add . && git commit -m "..." && git push origin main
```

`api/local.settings.json`: `USE_MOCK_DATA=true` — kein echter SP-Zugriff lokal.

---

## 13. Offene Punkte

### Funktional (nice-to-have)
- `UcForm.tsx`: Feldlabels (4 Tabs) noch auf Deutsch
- Bundle-Größe: >500 kB Warnung → Code-Splitting (dynamische Imports)

### Security Findings (offen aus Review 2026-06-08)
| Finding | Beschreibung |
|---|---|
| F3 | `Sites.Selected` statt `Sites.ReadWrite.All` — über SharePoint Admin Portal |
| F6 | Rate-Limiting (Azure API Management) |
| F8/9/11 | DSGVO-Dokumentation, TOMs, Löschkonzept |
| F12 | Audit-Immutability: SP-Versionierung aktivieren |

### Infrastruktur
- Custom Domain (optional)
- Key Vault Referenz für Client Secret (F1)
- SP Provisioning: Reliability-Spalten ggf. nachprovisionieren

---

## 14. Implementierte Features — Commit-Historie (wichtigste)

| Datum (ca.) | Feature |
|---|---|
| 2026-06-08 | Rollenmodell über AIOS_Users (SP), Security Review |
| 2026-06-10 | DE/EN-Zweisprachigkeit (i18n), Invited-Only-Zugriffsschutz |
| 2026-06-27 | Datenaustausch: Bundle Export/Import (exchange.ts) |

**Letzter Commit:** `47ddec1` — feat: UC data exchange — bulk export/import + single UC export
