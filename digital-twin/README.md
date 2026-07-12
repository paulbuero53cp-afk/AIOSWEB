# Digital Twin

Eigenständiges Projekt: die Basis für einen **digitalen Zwilling**. Sprachnotizen
aufnehmen, live transkribieren, automatisch nach Themen gliedern, durchsuchen —
und schrittweise Richtung Entscheidungen-nachvollziehen, Zusammenhänge-erkennen
und Strategien-ableiten ausbauen.

Bewusst **unabhängig von AIOS**. Läuft heute komplett im Browser — kein Backend,
keine Anmeldung, alle Daten bleiben lokal auf dem Gerät (`localStorage`).

## Verzeichnisstruktur

```
digital-twin/
├── app/                    # Installierbare PWA (mehrere Dateien, servieren)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── sw.js               # Service Worker (Offline-Cache)
│   ├── manifest.webmanifest
│   └── icon.svg
├── twin-lokal.html         # Single-File-Version (Doppelklick, kein Server)
├── ROADMAP.md              # Ausbaustufen Richtung digitaler Zwilling
└── README.md
```

## Zwei Wege, es zu nutzen

**A) Single-File (am einfachsten)** — `twin-lokal.html` per Doppelklick öffnen.
Alles eingebettet, kein Server. Tippen/Analyse/Suche/Export laufen überall;
das Mikrofon-Diktat kann bei `file://` je nach Browser blockiert sein.

**B) PWA (Diktat überall, installierbar)** — den `app/`-Ordner servieren:
```bash
cd digital-twin/app
python3 -m http.server 8080
# → http://localhost:8080   (am Handy: „Zum Startbildschirm hinzufügen")
```
Live-Spracherkennung braucht einen sicheren Kontext (`https`/`localhost`) — daher
servieren statt Datei direkt öffnen. Am zuverlässigsten in Chrome/Edge & Safari.

## Funktionen (heute)

- 🎙 Aufnahme & Live-Transkription (Web Speech API, Deutsch) + Tipp-Fallback
- 🏷 Automatische Themen-Erkennung (frequenzbasiert, Stoppwort-Filter, offline)
- 🔎 Volltext-Suche + Filter nach Themen-Chips
- 📌 Anpinnen · 🗑 Löschen · ⤓ JSON-Export
- 📱 Mobile-first Dark-UI, offlinefähig, installierbar (PWA)

## Datenmodell (`localStorage["twin_notes_v1"]`)

```ts
{
  id: string;            // vn-<timestamp>
  title: string;         // manuell oder automatisch abgeleitet
  transcript: string;    // Volltext
  topics: string[];      // erkannte Themen
  durationSec: number;   // Aufnahmedauer
  wordCount: number;
  createdAt: string;     // ISO-Datum
  pinned: boolean;
}
```

Nächste Schritte: siehe [ROADMAP.md](./ROADMAP.md).
