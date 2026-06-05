# AIOS-SESSION.md
# Session-Starter für Claude — bei jeder Session als erstes senden

## Projekt
- **App:** AIOS — AI Management System (Web App, Option B)
- **Stack:** React 18 + TypeScript + Vite + Azure Static Web Apps + Azure Functions + SharePoint Lists
- **Repo:** https://github.com/paulbuero53cp-afk/AIOSWEB
- **SWA URL:** https://gray-cliff-0220e3b10.7.azurestaticapps.net

## Konfiguration (ausfüllen wenn bekannt)
- **Azure Subscription ID:** 92a27a24-7f01-4c83-93da-234a762fab7a
- **Azure Resource Group:** AIOS_group
- **Tenant ID:** 73971f7b-211f-4ac6-a4b9-e16c4f9fd920
- **Client ID:** [ENTRA_CLIENT_ID]
- **SharePoint Site:** [SP_SITE_URL]
- **SharePoint Drive Item Path:** [DRIVE_ITEM_PATH]

## Projektstand

### ✅ Abgeschlossen (Session #1 — KW 20)
- [x] Projektstruktur: Vite + React + TypeScript
- [x] `src/types/index.ts` — vollständiges Datenmodell
- [x] `src/lib/constants.ts` — GATES, RA_DIMS, DSFA_TRIGGER, calcRiskScore
- [x] `src/lib/api.ts` — typisierter API-Client
- [x] `src/context/AuthContext.tsx` — Entra ID via /.auth/me
- [x] `src/styles/global.css` — vollständige CSS-Migration aus HTML v4
- [x] `src/App.tsx` — App Shell mit Navigation-Scaffold
- [x] `staticwebapp.config.json` — Auth + 4 Rollen + Security Headers
- [x] `scripts/Provision-SharePointLists.ps1` — 5 Listen
- [x] `.github/workflows/azure-static-web-apps.yml` — CI/CD Pipeline

### ✅ Abgeschlossen (Session #2 — KW 21)
- [x] `api/src/lib/graphClient.ts` — Managed Identity + ClientSecretCredential Fallback
- [x] `api/src/lib/auth.ts` — SWA Header-Auth, requireAuth(), requireRole(), isAuthError()
- [x] `api/src/lib/sharepoint.ts` — listItems, getItem, createItem, updateItem, deleteItem, findItem
- [x] `api/src/lib/mappers.ts` — spToUC/ucToSp, spToIncident/incidentToSp, spToArtefakt/artefaktToSp, spToAudit/auditToSp
- [x] `api/src/lib/audit.ts` — writeAuditLog(), diffObjects()
- [x] `api/src/functions/usecases.ts` — GET/POST/PATCH/DELETE mit Auth + Audit
- [x] `api/src/functions/incidents.ts` — GET/POST/PATCH
- [x] `api/src/functions/artefakte.ts` — GET/POST + /all/{ucId} + /export
- [x] `api/src/functions/auditlog.ts` — GET (Admin only)
- [x] `api/src/functions/config.ts` — GET/POST COMPANY-Objekt
- [x] `api/host.json`, `api/tsconfig.json`, `api/package.json`, `api/.gitignore`
- [x] TypeScript kompiliert fehlerfrei (`tsc --noEmit` = 0 Errors)

### ✅ Abgeschlossen (Session #7 — KW 18/2026)
- [x] Git init + .gitignore
- [x] Erster Push auf github.com/paulbuero53cp-afk/AIOSWEB
- [x] Azure SWA erstellt + Repo verbunden
- [x] CI/CD Pipeline verifiziert (Hello-World-Build)
- [x] SESSION.md aktualisiert

### ✅ Abgeschlossen (Session #8 — KW 20/2026) — AI Reliability Framework
**P0 — Datenmodell & Grundtypen**
- [x] `src/types/index.ts` — `ReliabilityTier`, `HitlMode`, `AutonomyLevel`, `FailureMode` Types; `UseCase` + `Incident` + `GateChecks` erweitert
- [x] `src/components/common/Badge.tsx` — `ReliabilityBadge` (R1 grün → R5 rot)
- [x] `src/components/screens/UcForm.tsx` — Tab 4 "Reliabilität" (R-Tier, HITL-Modus, Autonomiegrad, Monitoring SLA, 5 Failure-Mode-Checkboxen)
- [x] `src/components/screens/UseCases.tsx` — R-Tier-Spalte (sortierbar)
- [x] `api/src/lib/mappers.ts` — 5 Reliability-Felder in spToUC/ucToSp; FailureMode in Incident-Mapper
- [x] `api/src/lib/mockData.ts` — Beispiel-Werte für UC-001/002/003 + INC-001/002

**P1 — Governance & Incidents**
- [x] `src/components/screens/Governance.tsx` — Reliability Snapshot (RlDistBar, R4/R5-Warnzeilen ohne SLA/Oversight), neues KPI-Tile
- [x] `src/components/screens/IncidentLog.tsx` — Failure-Mode-Filter, FM-Badge in IncCard, FM-Dropdown in Modal mit R4/R5-Warnung

**P2 — Gate-Checklisten & KI-Strategie**
- [x] `src/lib/constants.ts` — `GATES_RELIABILITY` (base R3+: 5 Items, agentic R5: 3 Items)
- [x] `src/components/screens/GateChecks.tsx` — Tier-spezifische Reliability Controls (nur ab R3), GatePanel generisch refaktoriert, Gesamtfortschritt korrekt
- [x] `src/components/screens/AiStrategy.tsx` — Sektion 12 "Meine Rolle" (HITL/HOTL-Erklärung, R-Tier-Grid, Agentic AI, Incident-CTA)

**P3 — AgentHub & Setup-Paket**
- [x] `src/components/screens/AgentHub.tsx` — Kontrollen-Ampel (4 Dots: Oversight/SLA/Gate-Check/Autonomy), R-Tier-Filter, KPI-Tiles (R4/R5-Count, Controls-Warnung)
- [x] `scripts/Provision-SharePointLists.ps1` — 5 RL-Spalten zu AIOS_UseCases + FailureMode zu AIOS_Incidents
- [x] TypeScript: 0 Fehler (Frontend + API)

### 🔄 In Arbeit / Offen

### ✅ Abgeschlossen (Session #3 — KW 22)
- [x] `src/context/ToastContext.tsx` — globaler Toast (showToast, success/error/info)
- [x] `src/hooks/useUseCases.ts` — SWR-basiert: useCases, createUC, updateUC, deleteUC, useIncidents
- [x] `src/components/common/Badge.tsx` — RiskBadge, ApprovalBadge, LifecycleBadge, KiTypeBadges, KpiBadge
- [x] `src/components/common/Modal.tsx` — wiederverwendbares Modal (ESC, Backdrop-Click)
- [x] `src/components/screens/Dashboard.tsx` — KPI-Kacheln, Portfolio-Snapshot, Risk-Verteilung, Kritische Items, Aktivitätsstrom (Admin)
- [x] `src/components/screens/UcForm.tsx` — geteiltes 3-Tab-Formular (Stammdaten/Bewertung/Governance), alle Felder inkl. legacy + kiType
- [x] `src/components/screens/NewUseCase.tsx` — Neu-Screen mit UcForm
- [x] `src/components/screens/EditModal.tsx` — Edit-Modal mit UcForm + vorausgefüllten Werten
- [x] `src/components/screens/UseCases.tsx` — Tabelle: Filter (5), Sort (alle Spalten), Pagination (25/S), Inline-Edit (PD, Approval)
- [x] `src/App.tsx` — vollständiges Screen-Routing, ToastProvider, ToastRenderer
- [x] TypeScript: 0 Fehler (`tsc --noEmit`)

### ✅ Abgeschlossen (Session #4 — KW 22)
- [x] `src/hooks/useIncidents.ts` — SWR-basiert: incidents, createIncident, updateIncident, openCount
- [x] `src/components/screens/Governance.tsx` — KPI-Leiste, Freigabe (Approve/Reject), High Risk, Trigger-Sektion, KPI-fehlt-Sektion
- [x] `src/components/screens/IncidentLog.tsx` — Kanban Open/InProgress/Resolved, IncidentModal (create+edit)
- [x] `src/components/screens/AgentHub.tsx` — Tile Grid, Cluster-Emoji-Mapping, Filter (Cluster, Risk, OR), KPI-Leiste
- [x] `src/App.tsx` — Live-Badges (govBadge, incBadge via SWR), alle 4 neuen Screens geroutet
- [x] TypeScript: 0 Fehler

### ✅ Abgeschlossen (Session #5 — KW 23)
- [x] `src/hooks/useArtefakt.ts` — generischer SWR-Hook für ra/gc/bc/dsfa + useArtefaktHub
- [x] `src/components/common/ArtHeader.tsx` — geteilter Artefakt-Header (UC-Select, Dirty-State, Speichern-Button)
- [x] `src/components/screens/RiskAssessment.tsx` — 7 Dimensionen, Score-Ring (SVG), EU AI Act Check, Mitigation, Sync → UC
- [x] `src/components/screens/GateChecks.tsx` — Gate A/B/C mit Fortschrittsbalken, Gesamt-Sidebar
- [x] `src/components/screens/BusinessCase.tsx` — Nutzen/Kosten, ROI 3J, Breakeven, Portfolio-Decision-Sync
- [x] `src/App.tsx` — alle 3 Screens geroutet
- [x] TypeScript: 0 Fehler

### ✅ Abgeschlossen (Session #6 — KW 24)
- [x] `src/components/screens/Dsfa.tsx` — vollständiger DSFA-Screen (7 Tabs: Teil I/II/III + Trigger-Ampel + Beschreibung + Risikobewertung + Maßnahmen)
- [x] `src/lib/exports.ts` — exportUseCasesCSV, exportIncidentsCSV, exportComplianceCSV (24 Spalten), exportArtefakteJSON, exportAuditLogCSV, exportExcel (SheetJS on-demand), printArtefakt
- [x] `src/components/screens/ArtefaktHub.tsx` — Dokumentations-Hub mit Compliance-Ampel, Artefakt-Status-Badges, Export-Dropdown (rollengesteuert), KPI-Leiste
- [x] `scripts/migrate-to-sharepoint.js` — CSV + Artefakte-JSON → SharePoint via Graph API, Dry-Run-Modus, Validierung
- [x] `src/App.tsx` — DSFA und ArtefaktHub geroutet
- [x] DSFA-Trigger konsolidiert: dt1-dt6 als einzige Trigger-Keys (Gap aus Dokumentation behoben)
- [x] TypeScript: 0 Fehler

#### AP 1.2.1 — Azure SWA + GitHub Repo (M365-Admin + Entwickler)
- [ ] GitHub Repo anlegen und URL eintragen
- [ ] Azure SWA erstellen und mit Repo verbinden
- [ ] swa-cli lokal installieren und testen
- [ ] Hello-World-Push → Auto-Deploy verifizieren

#### AP 1.2.2 — Entra App-Registrierung (M365-Admin)
- [ ] App registrieren
- [ ] Redirect URI setzen
- [ ] App Roles Manifest: AIOS.Viewer / .Editor / .Approver / .Admin
- [ ] Client Secret → SWA Environment Variables
- [ ] staticwebapp.config.json: TENANT_ID eintragen
- [ ] Test-Login durchführen (/.auth/me prüfen)

#### AP 1.2.3 — SharePoint Lists (M365-Admin)
- [ ] PnP PowerShell installieren
- [ ] Provision-SharePointLists.ps1 ausführen
- [ ] AuditLog-Berechtigungen einschränken
- [ ] Test-Item einfügen und via Graph Explorer lesen

#### AP 1.2.4 — Migrations-Script (Entwickler)
- [ ] Node.js Script für CSV → SharePoint
- [ ] Artefakte-JSON → AIOS_Artefakte
- [ ] Sandbox-Test mit AIOS v4 Export

### 📋 Backlog
- ~~AP 1.3.1 — Azure Functions API-Layer~~ ✅ Session #2
- AP 1.3.2 — AuthContext mit echten Daten testen (wartet auf Azure SWA + Entra App)
- ~~AP 1.3.3 — Dashboard Screen~~ ✅ Session #3
- ~~AP 1.3.4 — Use Case Management CRUD~~ ✅ Session #3
- ~~AP 1.3.5 — Governance Cockpit + Incident Log~~ ✅ Session #4
- ~~AP 1.4.1 — Risk Assessment~~ ✅ Session #5
- ~~AP 1.4.2 — Gate Checklisten~~ ✅ Session #5
- ~~AP 1.4.3 — Business Case~~ ✅ Session #5
- ~~AP 1.4.4 — DSFA~~ ✅ Session #6
- ~~AP 1.4.5 — Export-Funktionen~~ ✅ Session #6

## Bekannte Issues / Bugs
- [ ] `setChk()`-Hilfsfunktion in AIOS HTML v4 prüfen (Bug-Verdacht aus Review)
- [ ] DSFA-Trigger konsolidieren (dt1-dt6 vs. dsfa_scope/dsfa_sensitive Gap)

## Diese Session soll liefern
<!-- Vor jeder Session hier eintragen was gebraucht wird -->
[ ] ...

## Entscheidungen / Architektur-Notes
- **Auth:** SWA Built-in Auth — kein MSAL.js im Frontend
- **API:** Azure Functions als Proxy — kein direkter Graph-Call aus Browser
- **Datenhaltung:** SharePoint Lists — Artefakte als JSON-Blob (AIOS_Artefakte)
- **CSS:** 1:1 Migration aus HTML v4 — kein UI-Framework
- **i18n:** DE/EN — identische Struktur wie HTML v4

## Referenz-Dateien
- `AIOS_STODE_i18n_4.html` — HTML v4 (Quell-Referenz, Stand KW 20)
- `AIOS_Systemdokumentation_v4.docx` — Technische Doku (Datenmodell, Funktionen)
- `AIOS_M365_Betriebskonzept.docx` — Architekturentscheidung Option B
- `AIOS_Projektauftrag_v1.docx` — PSP, SIPOC, Meilensteine, Arbeitspakete
