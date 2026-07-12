# Roadmap — Digital Twin

Vom Sprachnotiz-Tool zum digitalen Zwilling. Jede Stufe ist für sich nutzbar.

## ✅ Stufe 0 — Fundament (erledigt)
- Aufnahme + Live-Transkription (Web Speech API) und manuelle Eingabe
- Automatische Themen-Erkennung (frequenzbasiert, offline)
- Volltext-Suche, Themen-Filter, Anpinnen, Löschen, JSON-Export
- PWA + Single-File-Variante, lokale Speicherung

## 🔜 Stufe 1 — Bessere Erfassung
- Audio-Aufnahme mitschneiden & archivieren (MediaRecorder → Blob/IndexedDB)
- Optionale Cloud-Transkription (z. B. Whisper) für höhere Genauigkeit
- Notiz nachträglich bearbeiten, Themen manuell korrigieren/ergänzen
- Import/Backup (JSON) — Gegenstück zum Export

## 🧠 Stufe 2 — Verstehen
- Semantische Suche über Embeddings (nach Bedeutung, nicht nur Stichwort)
- Automatische Kapitel/Cluster: verwandte Notizen gruppieren
- Zeitleiste & Themen-Verläufe (wie entwickelt sich ein Thema über Zeit)
- Verknüpfung zusammenhängender Notizen (Graph)

## 🎯 Stufe 3 — Zwilling
- Entscheidungen vorbereiten: relevante Notizen automatisch zusammenfassen
- Entscheidungen nachvollziehen: „warum habe ich damals X entschieden?"
- Strategien ableiten (LLM über den eigenen Notiz-Korpus)
- Frage-Antwort über die gesamte Historie (RAG)

## 🏗 Stufe 4 — Betrieb (optional)
- Eigenes Backend für Sync/Backup über Geräte hinweg
- Auth, verschlüsselte Speicherung
- Ggf. Auslagerung in ein eigenständiges Repository

---

### Architektur-Notizen
- **Datenhaltung:** heute `localStorage`; für Audio/Embeddings → IndexedDB.
- **KI-Schritte** (Transkription, Embeddings, Zusammenfassung) brauchen einen
  kleinen Backend-/API-Layer. Empfohlen: neueste Claude-Modelle für Analyse
  und Strategie-Ableitung.
- **Privacy first:** so viel wie möglich lokal; Cloud nur opt-in.
