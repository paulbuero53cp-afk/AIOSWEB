# Security & Compliance Review — AIOS Web App

| | |
|---|---|
| **Datum** | 2026-06-08 |
| **Reviewer-Rollen** | CISO/ISB · Datenschutzbeauftragter (DSGVO) · ISO/IEC 42001 Auditor · Friendly Hacker |
| **Scope** | `aios/` — React-Frontend, Azure Functions API, SWA-Config, CI/CD-Workflow |
| **Methodik** | Statischer Code-Review + Git-Historien-Analyse (kein Live-Pentest) |
| **Commit-Stand** | `11d3e4c` (main) |

**Schweregrade:** 🔴 Kritisch · 🟠 Hoch · 🟡 Mittel · 🟢 Niedrig
**Status-Legende:** ⬜ offen · 🟦 in Arbeit · ✅ erledigt · ⏸️ akzeptiertes Restrisiko

---

## Fix-Tracking (Übersicht)

| ID | Finding | Schwere | Rolle | Status |
|----|---------|---------|-------|--------|
| F1 | Client-Secret im Klartext in OneDrive-Ordner | 🔴 | Alle | ⬜ |
| F2 | Auth-Backdoor über `NODE_ENV` | 🔴 | CISO / Hacker | ✅ |
| F3 | Übermäßige Graph-Berechtigung `Sites.ReadWrite.All` | 🟠 | CISO | ⬜ |
| F4 | Interne Fehlerdetails an den Client | 🟡 | CISO | ✅ |
| F5 | CSP erlaubt `'unsafe-inline'` für Scripts | 🟡 | CISO | ✅ |
| F6 | Keine Rate-/Payload-Limits | 🟡 | CISO | ⬜ |
| F7 | Jeder Tenant-Nutzer wird Viewer (Bootstrap) | 🟡 | CISO / DSB | ✅ |
| F8 | PbD-Verarbeitung ohne dokumentierte Grundlage | 🟠 | DSB | ⬜ |
| F9 | Keine Aufbewahrungs-/Löschfristen | 🟡 | DSB | ⬜ |
| F10 | DSFA-Artefakte breit lesbar; Soft-Delete | 🟡 | DSB | ✅ |
| F11 | Datenfluss/AVV Microsoft dokumentieren | 🟢 | DSB | ⬜ |
| F12 | Audit-Log nicht manipulationssicher | 🟠 | ISO 42001 | ⬜ |
| F13 | Audit-Lücken (Rollen/Config/Export) | 🟠 | ISO 42001 | ✅ |
| F14 | Diff-Erfassung unvollständig | 🟢 | ISO 42001 | ✅ |
| F15 | OData-/SharePoint-Filter-Injection | 🟡 | Hacker | ✅ |
| F16 | CSRF bei Cookie-Auth | 🟡 | Hacker | ✅ |
| F17 | `frame-ancestors *.sharepoint.com` (Clickjacking) | 🟢 | Hacker | ✅ |

**Priorisierung:**
- **Sofort:** F1, F2
- **Kurzfristig:** F3, F12, F13, F4, F15
- **Mittelfristig:** F5, F6, F7, F10, F8, F9, F16
- **Nice-to-have:** F11, F14, F17

---

## 🔴 Sofortmaßnahmen

### F1 — Client-Secret im Klartext in OneDrive-synchronisiertem Ordner 🔴 ⬜
**Datei:** `api/local.settings.json`
`AZURE_CLIENT_SECRET` liegt im Klartext vor. Die Datei ist korrekt gitignored (verifiziert: **nicht** im Repo / keiner Historie), liegt aber unter `C:\Users\…\OneDrive\…` → wird in die Microsoft-Cloud synchronisiert und ist gegenüber jedem mit OneDrive-/Gerätezugriff exponiert. Der Wert wurde zudem während des Reviews in einer Assistenz-Session sichtbar → **als kompromittiert behandeln**.

**Mitigation:**
1. Secret rotieren (Entra → App-Registrierung `21ccdf12-06e9-40f6-99e2-d77784a7a285` → Zertifikate & Geheimnisse → altes widerrufen, neues erzeugen). *(Manuell im Portal — nicht automatisierbar.)*
2. Projekt/`local.settings.json` aus dem OneDrive-Sync-Pfad herausnehmen.
3. Produktion auf **System-Assigned Managed Identity** umstellen — `graphClient.ts` nutzt bereits `DefaultAzureCredential`, wenn kein Secret gesetzt ist. In Azure also **kein** `AZURE_CLIENT_SECRET` als App-Setting hinterlegen.

### F2 — Auth-Backdoor über `NODE_ENV` 🔴 ✅ (behoben 2026-06-08, Commit folgt)
**Datei:** `api/src/lib/auth.ts:19-33`
Ohne `x-ms-client-principal`-Header wurde ein Fake-Admin (`AIOS.Admin`) zurückgegeben, sofern `NODE_ENV !== 'production'`. Azure Functions setzt `NODE_ENV` **nicht** automatisch auf `production` → in Produktion war die Bedingung wahr, falls die Variable nicht explizit gesetzt ist.

**Umsetzung:** Dev-Fallback jetzt an explizites Opt-in `AIOS_DEV_AUTH === 'true'` gekoppelt. Lokal in `local.settings.json` gesetzt (gitignored), im `.example` dokumentiert mit Warnung „In Azure NIEMALS setzen".
**⚠️ Verbleibende Aufgabe:** Sicherstellen, dass `AIOS_DEV_AUTH` in den Azure Function-App-Settings **nicht** existiert (Default: nicht gesetzt → sicher).

---

## 🛡️ CISO / ISB — Informationssicherheit

### F3 — Übermäßige Graph-Berechtigung `Sites.ReadWrite.All` 🟠 ⬜
**Datei:** `api/src/lib/graphClient.ts:10` (dokumentierte Permission)
Die App-Registrierung hat tenant-weiten Lese-/Schreibzugriff auf **alle** SharePoint-Sites. Verstoß gegen Least Privilege; ein kompromittiertes Secret (F1) gefährdet den gesamten Tenant-SharePoint.
**Mitigation:** Auf `Sites.Selected` umstellen, der App per `Grant-MgSitePermission` nur die AIOS-Site freigeben.

### F4 — Interne Fehlerdetails an den Client 🟡 ✅ (behoben 2026-06-08)
**Dateien:** `usecases.ts`, `incidents.ts`, `config.ts`, `artefakte.ts`, `auditlog.ts`, `users.ts`
`String(err)` wurde an den Aufrufer zurückgegeben → leakte Graph-/Stacktrace-Interna.
**Umsetzung:** Zentraler Helfer `lib/http.ts → serverError(context, err)` — loggt Details via `context.error` mit `invocationId` und gibt dem Client nur `{ error: 'Interner Fehler', ref: <invocationId> }` zurück. In allen 6 Handler-Catches eingesetzt.

### F5 — CSP erlaubt `'unsafe-inline'` für Scripts 🟡 ✅ (behoben 2026-06-08)
**Datei:** `staticwebapp.config.json`
**Umsetzung:** `script-src` auf `'self'` reduziert (kein `'unsafe-inline'`); `connect-src` auf `'self'` verengt (Frontend ruft Graph nicht direkt); `Strict-Transport-Security` + `Referrer-Policy: strict-origin-when-cross-origin` ergänzt; deprecated `X-XSS-Protection` entfernt. `index.html` nutzt nur externes Modul-Script → kein Bruch.

### F6 — Keine Rate-/Payload-Limits 🟡 ⬜
**Dateien:** `artefakte.ts:133` (Payload), `auditlog.ts:24` (`parseInt` ohne NaN-Guard)
Kein Throttling; Artefakt-Payloads ungeprüft in Größe/Tiefe → DoS-/Kosten-/Storage-Abuse durch authentifizierte Nutzer.
**Mitigation:** Payload-Größe begrenzen (z.B. 256 KB), Limit-Param robust parsen, ggf. Front Door / APIM-Rate-Limiting.

### F7 — Jeder Tenant-Nutzer wird Viewer 🟡 ✅ (behoben 2026-06-08)
**Dateien:** `users.ts`, `AuthContext.tsx`
**Umsetzung:** Bootstrap-Fallback jetzt hinter `AIOS_BOOTSTRAP=true` (Default aus → „kein Eintrag = kein Zugriff"). Frontend gewährt bei `/me`-Fehler/403 keinen automatischen Viewer mehr — nur eine echte SWA-AIOS-Rolle oder `null` (kein Zugriff). Die 2 gelisteten Admins unberührt.
**Hinweis (Residual):** `requireAuth` akzeptiert für Lese-Endpoints weiter `'authenticated'` (Free-SKU-Kompromiss); die Autorisierung greift nun aber über die fehlende Rolle clientseitig + Bootstrap-Aus.

---

## 🔐 Datenschutzbeauftragter — DSGVO

### F8 — PbD-Verarbeitung ohne dokumentierte Grundlage 🟠 ⬜
**Datei:** `api/src/lib/mappers.ts:240-253`; Audit: `actor = userDetails`
Verarbeitet werden UPN/E-Mail, `AadUserId`, `DisplayName`, `LastLogin`, `InvitedBy` sowie E-Mail in jedem Audit-Eintrag. Kein Hinweis auf Rechtsgrundlage, Art.-30-Verzeichnis, Löschkonzept, TOMs, Art.-13-Informationspflichten.
**Mitigation:** Verarbeitungstätigkeit + Rechtsgrundlage dokumentieren; Nutzer-Informationspflichten umsetzen.

### F9 — Keine Aufbewahrungs-/Löschfristen 🟡 ⬜
**Datei:** `api/src/functions/auditlog.ts`, `users.ts` (`LastLogin`)
Audit-Log und `LastLogin` wachsen unbegrenzt (faktische Profilbildung). Kein Retention/Pruning.
**Mitigation:** Aufbewahrungsfrist definieren (z.B. 12 Monate, abgestimmt auf ISO-42001-Nachweispflicht), automatisiertes Pruning. Hard-Delete für Stammdaten existiert bereits (`users.ts:183-191`).

### F10 — DSFA-Artefakte breit lesbar; Soft-Delete 🟡 ✅ (behoben 2026-06-08)
**Dateien:** `artefakte.ts`, `usecases.ts`
**Umsetzung:** Artefakt-Inhalte (`handleGet`, `handleGetAll`, inkl. DSFA) jetzt nur für **Editor+** (vorher jeder Auth-Nutzer); `handleStatus` (nur Existenz-Badges) bleibt Viewer. Hard-Delete-Pfad für Use Cases ergänzt: `DELETE /api/usecases/{id}?hard=true` (Admin, irreversibel, Art. 17), Default bleibt Soft-Delete.
**Hinweis UX:** Nav zeigt Doc-Screens weiter allen; Viewer erhalten beim Öffnen jetzt 403 (konsistent mit bestehendem „Screen blockt"-Muster). Client-seitiges Gate optional nachrüstbar.

### F11 — Datenfluss/AVV Microsoft dokumentieren 🟢 ⬜
Daten in SharePoint/Graph im Tenant — Region/AVV abhängig von M365-Konfiguration. Im Datenschutzkonzept benennen (i.d.R. durch MS-AVV abgedeckt). Chatbot-Default-URL `https://claude.ai` (`config.ts:33`) beachten, falls produktiv aktiviert.

---

## 📋 ISO/IEC 42001 Auditor — AI Management System

### F12 — Audit-Log nicht manipulationssicher 🟠 ⬜
**Datei:** `api/src/lib/audit.ts:3` (Kommentar „unveränderlich" trifft nicht zu)
`AIOS_Auditlog` ist eine normale SharePoint-Liste; App-Identität (`Sites.ReadWrite.All`) und SP-Admins können Einträge ändern/löschen. Für ISO 42001 (Clause 9 / Nachweisführung) kritisch.
**Mitigation:** SP-Versionierung + „nur Anhängen"-Berechtigung; Audit zusätzlich in Append-only-Store spiegeln (Storage mit Immutability-Policy / Log Analytics).

### F13 — Audit-Lücken bei governance-kritischen Aktionen 🟠 ✅ (behoben 2026-06-08)
**Dateien:** `audit.ts`, `users.ts`, `config.ts`, `artefakte.ts`
**Umsetzung:** `AuditAction`/`AuditEntity` um `role-change`/`config-change`/`export` bzw. `User`/`Config` erweitert. `writeAuditLog` ergänzt in: User-Anlage/-Edit/-Rollenwechsel/-Löschung, Config-Änderung und Artefakt-Vollexport (mit Vorher/Nachher-Diff wo sinnvoll).

### F14 — Diff-Erfassung unvollständig 🟢 ✅ (behoben 2026-06-08)
**Dateien:** `usecases.ts`, `incidents.ts`
**Umsetzung:** Create-Audits erfassen jetzt die neuen Werte (`diffObjects({}, newObj)`); Use-Case-Delete erfasst den Vorher-Zustand. **Offen (Residual):** Audit-Write läuft weiterhin `await` nach dem Daten-Write — bei Audit-Fehler 500 trotz erfolgter Änderung möglich (geringes Risiko; transaktionale Behandlung später).

---

## 🥷 Friendly Hacker — Offensive

### F15 — OData-/SharePoint-Filter-Injection 🟡 ✅ (behoben 2026-06-08)
**Dateien:** `usecases.ts`, `artefakte.ts`, `auditlog.ts`
Pfad-/Query-Parameter (`ucId`, `entity`, `type`) wurden ungeprüft in OData-Filter interpoliert; ein `'` bricht aus dem String aus.
**Umsetzung:** `lib/sharepoint.ts → odataEscape(v)` verdoppelt Single-Quotes; auf alle interpolierten Filterwerte angewandt. Der frühere `email`-Filter in `users.ts:151` entfiel bereits durch die In-Memory-Umstellung (Commit `2e83d3f`). `type` war zusätzlich schon via `isValidType` gewhitelistet.

### F16 — CSRF bei Cookie-basierter Auth 🟡 ✅ (behoben 2026-06-08)
**Dateien:** `auth.ts`, `src/lib/api.ts`
**Umsetzung:** Custom-Header-Pflicht: `requireAuth` lehnt schreibende Requests (POST/PATCH/DELETE) ohne `X-Requested-With` mit 403 ab. Das Frontend sendet den Header bei allen `apiFetch`-Calls. Cross-Site-Requests können ohne CORS-Freigabe keinen Custom-Header setzen → proxy-sicher, unabhängig vom `SameSite`-Verhalten.

### F17 — `frame-ancestors *.sharepoint.com` 🟢 ✅ (behoben 2026-06-08)
**Datei:** `staticwebapp.config.json`
**Umsetzung:** `frame-ancestors` von `https://*.sharepoint.com` auf die konkrete Site `https://handsonaiowl771.sharepoint.com` verengt.

---

## Positiv bestätigt
- ✅ Server-seitige Rollenprüfung in allen schreibenden Handlern (Defense in Depth)
- ✅ Secret **nicht** in Git-Historie; `.gitignore` sauber
- ✅ Kein direkter Graph-Call aus dem Browser; kein `dangerouslySetInnerHTML`/`eval`
- ✅ CSP, `X-Content-Type-Options: nosniff`, erzwungener AAD-Login vorhanden
- ✅ Audit-Logging grundsätzlich implementiert; Soft-Delete + Hard-Delete vorhanden

---

## Änderungshistorie
| Datum | Autor | Änderung |
|-------|-------|----------|
| 2026-06-08 | Security-Review (4-Rollen) | Erstfassung, 17 Findings |
| 2026-06-08 | Fix-Durchlauf | F2, F4, F15 behoben |
| 2026-06-08 | Fix-Durchlauf | F5, F7, F10, F13, F14, F16, F17 behoben — verbleibend: F1, F3, F6, F8, F9, F11, F12 |
