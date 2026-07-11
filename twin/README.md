# Twin — Sprachnotizen (eigenständige App)

Erste Ausbaustufe deines „digitalen Zwillings": Sprachnotizen aufnehmen,
live transkribieren, automatisch nach Themen verschlagworten, durchsuchen.
Läuft komplett im Browser — **kein Backend, keine Anmeldung**. Alle Daten
bleiben lokal auf dem Gerät (`localStorage`).

Diese App ist bewusst **unabhängig von AIOS** und liegt in ihrem eigenen
Ordner `twin/`.

## Was sie heute kann
- 🎙 **Aufnahme & Live-Transkription** über die Web Speech API (Deutsch)
- ✍️ **Manuelle Eingabe** als Fallback (falls der Browser keine Spracherkennung hat)
- 🏷 **Themen-Erkennung** — jede Notiz wird automatisch verschlagwortet
  (frequenzbasiert mit Stoppwort-Filter, deterministisch, offline)
- 🔎 **Volltext-Suche** + Filter nach Themen-Chips
- 📌 Anpinnen, 🗑 Löschen, ⤓ JSON-Export
- 📱 **PWA** — auf dem Handy installierbar, offlinefähig

## Starten
Am Handy braucht die Spracherkennung/das Mikrofon einen **sicheren Kontext**
(`https://` oder `localhost`). Einfach lokal servieren:

```bash
cd twin
python3 -m http.server 8080
# dann im Browser: http://localhost:8080
```

Auf dem Handy „Zum Startbildschirm hinzufügen" wählen → läuft wie eine App.

> Hinweis: Live-Spracherkennung funktioniert am zuverlässigsten in
> Chrome/Edge (Desktop & Android) sowie Safari (iOS). Ohne Unterstützung
> lässt sich die Notiz manuell eintippen — alle übrigen Funktionen bleiben.

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

## Dateien
| Datei | Zweck |
|-------|-------|
| `index.html` | App-Shell / Markup |
| `styles.css` | Mobile-first Dark-UI |
| `app.js` | Aufnahme, Analyse, Speicher, Suche, Rendering |
| `sw.js` | Service Worker (Offline-Cache) |
| `manifest.webmanifest` | PWA-Manifest |
| `icon.svg` | App-Icon |

## Roadmap Richtung „digitaler Zwilling"
- Cloud-Transkription (z. B. Whisper) für höhere Genauigkeit & Audio-Archiv
- Semantische Suche + automatische Kapitel/Cluster über Embeddings
- Zeitleiste & Themen-Verläufe, Verknüpfung zusammenhängender Notizen
- Entscheidungen vorbereiten/nachvollziehen, Strategien ableiten (LLM)
- Optional: Sync/Backup über ein eigenes Backend
