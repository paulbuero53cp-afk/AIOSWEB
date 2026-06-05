# AIOS — Lokal starten (SQLite-Version)

## Voraussetzungen (einmalig prüfen)

| Tool | Mindestversion | Prüfen mit |
|------|---------------|------------|
| Node.js | 20.x | `node --version` |
| npm | 10.x | `npm --version` |
| Azure Functions Core Tools | 4.x | `func --version` |
| SWA CLI | beliebig | `swa --version` |

**Node.js und Azure Functions Core Tools sind bereits installiert.**  
SWA CLI noch nicht → Schritt 1.

---

## Schritt 1 — SWA CLI installieren (einmalig)

```powershell
npm install -g @azure/static-web-apps-cli
```

Danach prüfen:
```powershell
swa --version
# z.B. 2.0.2
```

---

## Schritt 2 — Abhängigkeiten installieren (einmalig)

Im Ordner `AIOSWebApp_FINAL\aios\` ausführen:

```powershell
# Frontend-Abhängigkeiten
npm install

# API-Abhängigkeiten (inkl. better-sqlite3)
npm install --prefix api
```

> **Hinweis zu better-sqlite3:**  
> Das Paket enthält vorkompilierte Binaries für Windows. Falls die Installation
> mit einem Kompilierungsfehler abbricht, einmalig ausführen:
> ```powershell
> npm install -g windows-build-tools
> ```
> Dann `npm install --prefix api` wiederholen.

---

## Schritt 3 — API bauen

```powershell
npm run build --prefix api
```

Ausgabe bei Erfolg: *(keine Fehler, nur "tsc")*  
Die kompilierten Dateien landen in `api/dist/`.

---

## Schritt 4 — App starten

```powershell
npm run dev:full
```

Dieser Befehl startet drei Prozesse gleichzeitig:

| Prozess | Port | Farbe im Terminal |
|---------|------|-------------------|
| Vite (Frontend) | 5173 | cyan |
| Azure Functions (API) | 7071 | green |
| SWA CLI (Proxy + Auth) | 4280 | yellow |

**Warten bis alle drei "ready" melden**, dann Browser öffnen:  
👉 **http://localhost:4280**

> Nicht http://localhost:5173 verwenden — dort läuft nur das Frontend  
> ohne API-Anbindung und ohne Auth.

---

## Schritt 5 — Lokalen Benutzer anlegen (SWA-Login)

Beim ersten Aufruf leitet SWA auf eine lokale Login-Seite weiter:

1. Auf **"Login"** klicken
2. Formular ausfüllen:
   - **Username:** `admin` (beliebig)
   - **User ID:** `dev-001` (beliebig)
   - **Roles:** `AIOS.Admin,authenticated`

   > Für eingeschränkten Zugang stattdessen:  
   > `AIOS.Viewer,authenticated` oder `AIOS.Editor,authenticated`

3. **"Login"** bestätigen → App öffnet sich

---

## Datenbank — Was passiert automatisch

Die SQLite-Datenbank wird beim **ersten API-Aufruf** automatisch erstellt:

```
aios/
└── api/
    └── data/
        └── aios.db   ← wird automatisch angelegt
```

Kein manuelles Setup nötig. Beim ersten `npm run dev:full` ist die DB leer —
Use Cases, Incidents usw. werden über die App selbst befüllt.

### DB-Pfad anpassen (optional)

In `api/local.settings.json` unter `Values`:
```json
"LOCAL_DB_PATH": "C:\\MeinOrdner\\aios-data"
```

### DB zurücksetzen

Einfach die Datei löschen — sie wird beim nächsten Start neu erstellt:
```powershell
Remove-Item api\data\aios.db
```

### DB-Inhalt anschauen (optional)

Mit dem kostenlosen Tool **DB Browser for SQLite** (https://sqlitebrowser.org):
- Datei `api/data/aios.db` öffnen
- Tabelle `items` enthält alle Datensätze
- Spalte `list_name`: USECASES | INCIDENTS | ARTEFAKTE | AUDITLOG | CONFIG
- Spalte `fields`: JSON mit allen Feldinhalten

---

## Zwischen SQLite und SharePoint wechseln

Nur in `api/local.settings.json` ändern:

```json
// SQLite (lokal)
"USE_LOCAL_DB": "true",
"USE_MOCK_DATA": "false"

// SharePoint (Azure)
"USE_LOCAL_DB": "false",
"USE_MOCK_DATA": "false"
```

→ Danach `npm run build --prefix api` + Neustart

---

## Schnellreferenz — Täglicher Start

```powershell
# Im Ordner AIOSWebApp_FINAL\aios\
npm run dev
# Browser: http://localhost:5173
```

> **Hinweis:** Direkt Vite + Functions nutzen — kein SWA-Proxy nötig.  
> Die `vite.config.ts` enthält bereits Mock-Auth (automatisch als Admin)  
> und API-Proxy (`/api` → Port 7071).

---

## Häufige Fehler

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `swa: command not found` | SWA CLI nicht installiert | Schritt 1 wiederholen |
| `Cannot find module 'better-sqlite3'` | npm install fehlt | `npm install --prefix api` |
| Port 4280 belegt | Anderer Prozess | `npx kill-port 4280` |
| Port 7071 belegt | Anderer func-Prozess | `npx kill-port 7071` |
| 403 nach Login | Rolle fehlt | SWA-Login: Rolle `AIOS.Admin,authenticated` eintragen |
| DB-Fehler beim Start | Pfad nicht vorhanden | `api/data/` Ordner wird automatisch erstellt — `npm run build --prefix api` prüfen |
