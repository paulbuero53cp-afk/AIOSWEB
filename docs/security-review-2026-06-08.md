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
| F4 | Interne Fehlerdetails an den Client | 🟡 | CISO | ⬜ |
| F5 | CSP erlaubt `'unsafe-inline'` für Scripts | 🟡 | CISO | ⬜ |
| F6 | Keine Rate-/Payload-Limits | 🟡 | CISO | ⬜ |
| F7 | Jeder Tenant-Nutzer wird Viewer (Bootstrap) | 🟡 | CISO / DSB | ⬜ |
| F8 | PbD-Verarbeitung ohne dokumentierte Grundlage | 🟠 | DSB | ⬜ |
| F9 | Keine Aufbewahrungs-/Löschfristen | 🟡 | DSB | ⬜ |
| F10 | DSFA-Artefakte breit lesbar; Soft-Delete | 🟡 | DSB | ⬜ |
| F11 | Datenfluss/AVV Microsoft dokumentieren | 🟢 | DSB | ⬜ |
| F12 | Audit-Log nicht manipulationssicher | 🟠 | ISO 42001 | ⬜ |
| F13 | Audit-Lücken (Rollen/Config/Export) | 🟠 | ISO 42001 | ⬜ |
| F14 | Diff-Erfassung unvollständig | 🟢 | ISO 42001 | ⬜ |
| F15 | OData-/SharePoint-Filter-Injection | 🟡 | Hacker | ⬜ |
| F16 | CSRF bei Cookie-Auth | 🟡 | Hacker | ⬜ |
| F17 | `frame-ancestors *.sharepoint.com` (Clickjacking) | 🟢 | Hacker | ⬜ |

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

### F4 — Interne Fehlerdetails an den Client 🟡 ⬜
**Dateien:** `usecases.ts:218`, `incidents.ts:103`, `config.ts:87`, `artefakte.ts:197`
`String(err)` wird an den Aufrufer zurückgegeben → leakt Graph-/Stacktrace-Interna (Site-IDs, Feldnamen, Pfade).
**Mitigation:** Generische Client-Message + Correlation-ID; Details nur via `context.error(...)` ins Log.

### F5 — CSP erlaubt `'unsafe-inline'` für Scripts 🟡 ⬜
**Datei:** `staticwebapp.config.json:23`
`script-src 'self' 'unsafe-inline'` entwertet den CSP-XSS-Schutz. Aktuell kein XSS-Sink gefunden (React escaped), aber Schutzschicht offen. `X-XSS-Protection` (Z.25) ist deprecated.
**Mitigation:** `'unsafe-inline'` aus `script-src` entfernen; `Strict-Transport-Security` und `Referrer-Policy` ergänzen; `X-XSS-Protection` auf `0` setzen/entfernen.

### F6 — Keine Rate-/Payload-Limits 🟡 ⬜
**Dateien:** `artefakte.ts:133` (Payload), `auditlog.ts:24` (`parseInt` ohne NaN-Guard)
Kein Throttling; Artefakt-Payloads ungeprüft in Größe/Tiefe → DoS-/Kosten-/Storage-Abuse durch authentifizierte Nutzer.
**Mitigation:** Payload-Größe begrenzen (z.B. 256 KB), Limit-Param robust parsen, ggf. Front Door / APIM-Rate-Limiting.

### F7 — Jeder Tenant-Nutzer wird Viewer 🟡 ⬜
**Dateien:** `auth.ts:55-61`, `users.ts:92-99`
`'authenticated'` genügt als Zugang; Bootstrap-Fallback gewährt jedem nicht-gelisteten Nutzer `AIOS.Viewer`, solange die Liste ≤5 Einträge hat → jedes Tenant-Mitglied kann alle Use Cases, Incidents und DSFA lesen.
**Mitigation:** Bootstrap-Fallback nach Ersteinrichtung per Flag deaktivieren; danach „kein Eintrag = kein Zugriff".

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

### F10 — DSFA-Artefakte breit lesbar; Soft-Delete 🟡 ⬜
**Dateien:** `artefakte.ts` (Leserollen), `usecases.ts:191` (Soft-Delete)
DSFA/Risikoanalysen für alle Auth-Nutzer lesbar (siehe F7). Soft-Delete bewahrt „gelöschte" Daten dauerhaft → Spannung zu Art. 17.
**Mitigation:** Lesezugriff auf DSFA/Artefakte auf Editor+ einschränken; Hard-Delete-Pfad für echte Löschungen.

### F11 — Datenfluss/AVV Microsoft dokumentieren 🟢 ⬜
Daten in SharePoint/Graph im Tenant — Region/AVV abhängig von M365-Konfiguration. Im Datenschutzkonzept benennen (i.d.R. durch MS-AVV abgedeckt). Chatbot-Default-URL `https://claude.ai` (`config.ts:33`) beachten, falls produktiv aktiviert.

---

## 📋 ISO/IEC 42001 Auditor — AI Management System

### F12 — Audit-Log nicht manipulationssicher 🟠 ⬜
**Datei:** `api/src/lib/audit.ts:3` (Kommentar „unveränderlich" trifft nicht zu)
`AIOS_Auditlog` ist eine normale SharePoint-Liste; App-Identität (`Sites.ReadWrite.All`) und SP-Admins können Einträge ändern/löschen. Für ISO 42001 (Clause 9 / Nachweisführung) kritisch.
**Mitigation:** SP-Versionierung + „nur Anhängen"-Berechtigung; Audit zusätzlich in Append-only-Store spiegeln (Storage mit Immutability-Policy / Log Analytics).

### F13 — Audit-Lücken bei governance-kritischen Aktionen 🟠 ⬜
**Dateien:** `users.ts`, `config.ts`, `artefakte.ts:103` (Export)
Nicht geloggt: Rollenänderungen, User-Anlage/-Löschung, Config-Änderungen, Voll-Export aller Artefakte — also gerade die audit-relevantesten Vorgänge.
**Mitigation:** `writeAuditLog` in alle Admin-Mutationen + in `handleExport` einbauen (Entitätstypen `User`, `Config`, `Export` ergänzen).

### F14 — Diff-Erfassung unvollständig 🟢 ⬜
**Datei:** `usecases.ts:121,196`
Bei `create`/`delete` wird `{}` als Diff übergeben → Inhalt neuer/gelöschter Datensätze nicht nachvollziehbar. Audit-Write `await`ed nach Daten-Write → 500 trotz erfolgter Änderung möglich (Inkonsistenz Daten↔Audit).
**Mitigation:** Bei Create Initialzustand, bei Delete letzten Zustand in den Diff schreiben; Audit-Fehler robust behandeln.

---

## 🥷 Friendly Hacker — Offensive

### F15 — OData-/SharePoint-Filter-Injection 🟡 ⬜
**Dateien:** `usecases.ts:51,148`; `artefakte.ts:42,64,141`; `auditlog.ts:35`; `users.ts:151`
Pfad-/Query-Parameter (`ucId`, `entity`, `email`) werden ungeprüft in OData-Filter interpoliert; ein `'` bricht aus dem String aus. Impact durch ohnehin breiten Lesezugriff begrenzt (Filter-Bypass/Fehler/DoS), aber klassische Injection-Schwäche. `type` ist bereits gewhitelistet (gut).
**Mitigation:** Single-Quotes verdoppeln (`v.replace(/'/g, "''")`) + Format-Whitelist für IDs (`/^UC-\d{4}-\d{2}-\d{3}$/` etc.).

### F16 — CSRF bei Cookie-basierter Auth 🟡 ⬜
**Datei:** `src/lib/api.ts:14`
SWA-Session-Cookie ohne CSRF-Token/Origin-Bindung bei schreibenden Requests → potenzielle CSRF, falls Cookie nicht strikt `SameSite`.
**Mitigation:** `SameSite` des SWA-Auth-Cookies verifizieren; Origin/Referer-Check oder Custom-Header-Pflicht in schreibenden Handlern.

### F17 — `frame-ancestors *.sharepoint.com` 🟢 ⬜
**Datei:** `staticwebapp.config.json:23`
Einbettung durch jede SharePoint-Subdomain → Clickjacking-Fläche. Bewusst gesetzt (SP-Einbettung), aber so eng wie möglich fassen (konkrete Site).

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
