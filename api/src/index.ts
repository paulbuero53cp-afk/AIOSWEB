// ─────────────────────────────────────────────────────────────
//  AIOS API — Entry Point
//  Importiert alle Function-Definitionen (Registrierung via app.http())
//
//  ⚠️  JEDE neue Datei unter functions/ MUSS hier importiert werden.
//      Azure Functions v4 registriert eine Function NUR, wenn ihr Modul
//      über diesen Entry-Point (package.json "main") geladen wird.
//      Fehlt der Import → stiller 404 auf die Route, KEIN Build-Fehler.
// ─────────────────────────────────────────────────────────────

import './functions/usecases';
import './functions/incidents';
import './functions/artefakte';
import './functions/auditlog';
import './functions/config';
import './functions/users';
import './functions/aitools';
import './functions/exchange';
import './functions/submit';
