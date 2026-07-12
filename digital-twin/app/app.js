/* ─────────────────────────────────────────────────────────────
   Twin — Sprachnotizen (standalone, kein Backend)
   Aufnahme → Live-Transkription → Analyse → Speicher → Suche
   Alles bleibt lokal (localStorage) auf dem Gerät.
───────────────────────────────────────────────────────────── */
'use strict';

// ── 1. Text-Analyse ───────────────────────────────────────────
const STOPWORDS = new Set(('aber alle allem allen aller alles also auch auf aus bei beim bin bis ' +
  'bist dann dass dein dem den der des dessen die dies diese diesem diesen dieser dieses doch dort ' +
  'durch ein eine einem einen einer eines etwas euer eure für gegen gewesen hab habe haben hat hatte ' +
  'hatten hier hin hinter ich ihr ihre ihrem ihren ihrer ihres ins ist jede jedem jeden jeder jedes ' +
  'jener jetzt kann kein keine keinem keinen keiner können machen man mehr mein meine mit muss musste ' +
  'nach nicht nichts noch nun nur oben oder schon sehr sein seine seinem seinen seiner seines selbst ' +
  'sich sie sind soll sollte sondern sonst über und uns unser unter viel vom von vor wann war waren ' +
  'warum was weg weil weiter welche welchem welchen welcher welches wenn werde werden wie wieder will ' +
  'wir wird wirst wo wollen wollte würde zum zur zwar zwischen ja nein quasi halt eben einfach ' +
  'irgendwie sozusagen wirklich eigentlich total immer gerade gleich mal ganz denn damit dazu daran ' +
  'darauf davon dadurch dabei the and for that this with you are was have has not but they from what ' +
  'when your our can will would should about there their been were').split(' '));

function normToken(raw) {
  return raw.toLowerCase().replace(/[^a-zäöüß0-9-]/g, '').replace(/^-+|-+$/g, '');
}

function extractTopics(text, max = 6) {
  if (!text.trim()) return [];
  const score = new Map(), display = new Map();
  for (const w of text.split(/\s+/)) {
    const tok = normToken(w);
    if (tok.length < 4 || STOPWORDS.has(tok) || /^\d+$/.test(tok)) continue;
    const letters = w.replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    const isCap = /^[A-ZÄÖÜ]/.test(letters);
    score.set(tok, (score.get(tok) || 0) + (isCap ? 1.6 : 1));
    if (!display.has(tok) || isCap) {
      const clean = w.replace(/[^A-Za-zÄÖÜäöüß0-9-]/g, '');
      display.set(tok, isCap ? clean : clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([t]) => display.get(t));
}

function deriveTitle(text, maxLen = 60) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const first = trimmed.split(/[.!?\n]/)[0].trim();
  const base = first.length >= 8 ? first : trimmed;
  return base.length <= maxLen ? base : base.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

// ── 2. Speicher ───────────────────────────────────────────────
const STORE_KEY = 'twin_notes_v1';
let notes = [];
try { notes = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { notes = []; }
if (!Array.isArray(notes)) notes = [];

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(notes)); } catch {}
}

// ── 3. Helpers ────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fmtDur(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}
function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('de-DE',
      { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

let toastTimer = null;
function toast(msg, kind) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show' + (kind ? ' ' + kind : '');
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; setTimeout(() => (el.hidden = true), 250); }, 2600);
}

// ── 4. Aufnahme (Web Speech API) ──────────────────────────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let rec = null, recording = false, seconds = 0, timer = null, finalText = '';

function updateDraftUI() {
  const has = finalText.trim().length > 0;
  $('draftActions').hidden = recording || !has;
  const tp = has ? extractTopics(finalText, 5) : [];
  const box = $('draftTopics');
  if (tp.length) {
    box.hidden = false;
    box.innerHTML = '<span class="chip static" style="background:none;border:none;color:var(--muted);padding-left:0">Erkannte Themen:</span>'
      + tp.map((t) => `<span class="chip static">#${esc(t)}</span>`).join('');
  } else box.hidden = true;
}

function startRec() {
  if (!SR) { toast('Spracherkennung wird von diesem Browser nicht unterstützt — bitte Text tippen.', 'err'); return; }
  rec = new SR();
  rec.lang = 'de-DE';
  rec.continuous = true;
  rec.interimResults = true;

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText = (finalText + ' ' + r[0].transcript).replace(/\s+/g, ' ').trim();
      else interim += r[0].transcript;
    }
    $('draft').value = (finalText + ' ' + interim).trim();
    const im = $('interim');
    im.hidden = !interim; im.textContent = interim ? '… ' + interim : '';
    updateDraftUI();
  };
  rec.onerror = (ev) => {
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
      toast('Mikrofon-Zugriff verweigert. Bitte in den Einstellungen erlauben.', 'err');
      stopRec();
    }
  };
  rec.onend = () => { if (recording) { try { rec.start(); } catch {} } };

  try {
    rec.start();
    recording = true;
    seconds = 0;
    $('micBtn').classList.add('recording');
    $('recTitle').textContent = 'Aufnahme läuft…';
    $('recHint').textContent = 'Sprich einfach — der Text erscheint live.';
    $('recTimer').hidden = false; $('recTimer').textContent = '0:00';
    $('draft').setAttribute('readonly', '');
    timer = setInterval(() => { seconds++; $('recTimer').textContent = fmtDur(seconds) || '0:00'; }, 1000);
  } catch { toast('Aufnahme konnte nicht gestartet werden.', 'err'); }
}

function stopRec() {
  recording = false;
  clearInterval(timer); timer = null;
  if (rec) { const r = rec; rec = null; try { r.stop(); } catch {} }
  $('micBtn').classList.remove('recording');
  $('recTitle').textContent = 'Neue Sprachnotiz';
  $('recHint').textContent = SR ? 'Tippe auf das Mikrofon und sprich los.' : 'Tippe deine Notiz unten ein.';
  $('recTimer').hidden = true;
  $('interim').hidden = true;
  $('draft').removeAttribute('readonly');
  updateDraftUI();
}

function resetDraft() {
  stopRec();
  finalText = '';
  seconds = 0;
  $('draft').value = '';
  $('draftTitle').value = '';
  updateDraftUI();
}

function saveDraft() {
  const text = $('draft').value.trim();
  if (!text) { toast('Noch kein Text erfasst.', 'err'); return; }
  const note = {
    id: 'vn-' + Date.now(),
    title: ($('draftTitle').value.trim() || deriveTitle(text)) || 'Ohne Titel',
    transcript: text,
    topics: extractTopics(text),
    durationSec: seconds,
    wordCount: countWords(text),
    createdAt: new Date().toISOString(),
    pinned: false,
  };
  notes.unshift(note);
  persist();
  resetDraft();
  render();
  toast('Gespeichert & analysiert.', 'ok');
}

// ── 5. Rendering ──────────────────────────────────────────────
let query = '', activeTopic = null;

function topicCounts() {
  const m = new Map();
  for (const n of notes) for (const t of n.topics) m.set(t, (m.get(t) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
}

function filtered() {
  const q = query.trim().toLowerCase();
  return notes
    .filter((n) => !activeTopic || n.topics.includes(activeTopic))
    .filter((n) => !q || n.title.toLowerCase().includes(q) ||
      n.transcript.toLowerCase().includes(q) || n.topics.some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => (!!a.pinned !== !!b.pinned ? (a.pinned ? -1 : 1) : b.createdAt.localeCompare(a.createdAt)));
}

function noteHTML(n) {
  const long = n.transcript.length > 220;
  const meta = ['🕑 ' + fmtDate(n.createdAt)];
  if (n.durationSec > 0) meta.push('⏱ ' + fmtDur(n.durationSec) + ' min');
  meta.push('📝 ' + n.wordCount + ' Wörter');
  return `<article class="note" data-id="${n.id}">
    <div class="note-head">
      <div class="note-title">${n.pinned ? '📌 ' : ''}${esc(n.title)}</div>
      <div class="note-actions">
        <button data-act="pin" class="${n.pinned ? 'on' : ''}" title="Anpinnen">📌</button>
        <button data-act="del" title="Löschen">🗑</button>
      </div>
    </div>
    <div class="note-meta">${meta.map((m) => `<span>${m}</span>`).join('')}</div>
    ${n.topics.length ? `<div class="chips">${n.topics.map((t) => `<span class="chip static">#${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="note-body" data-full="${esc(n.transcript)}">${esc(long ? n.transcript.slice(0, 220).replace(/\s+\S*$/, '') + '…' : n.transcript)}</div>
    ${long ? '<button class="more-btn" data-act="more">mehr anzeigen</button>' : ''}
  </article>`;
}

function render() {
  const has = notes.length > 0;
  $('stats').hidden = !has;
  $('toolbar').hidden = !has;
  $('empty').hidden = has;

  if (has) {
    $('stNotes').textContent = notes.length;
    const tc = topicCounts();
    $('stTopics').textContent = tc.length;
    $('stMin').textContent = Math.round(notes.reduce((s, n) => s + n.durationSec, 0) / 60);

    $('topicFilter').innerHTML =
      `<span class="chip ${activeTopic === null ? 'active' : ''}" data-topic="">Alle</span>` +
      tc.map(([t, c]) => `<span class="chip ${activeTopic === t ? 'active' : ''}" data-topic="${esc(t)}">#${esc(t)} <span class="cnt">${c}</span></span>`).join('');
  }

  const list = filtered();
  const wrap = $('notes');
  if (has && list.length === 0) {
    wrap.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:40px 20px">Keine Treffer.</div>`;
  } else {
    wrap.innerHTML = list.map(noteHTML).join('');
  }
}

// ── 6. Events ─────────────────────────────────────────────────
$('micBtn').addEventListener('click', () => (recording ? stopRec() : startRec()));
$('saveBtn').addEventListener('click', saveDraft);
$('discardBtn').addEventListener('click', resetDraft);
$('draft').addEventListener('input', (e) => { if (!recording) { finalText = e.target.value; updateDraftUI(); } });
$('search').addEventListener('input', (e) => { query = e.target.value; render(); });

$('topicFilter').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-topic]');
  if (!chip) return;
  const t = chip.getAttribute('data-topic');
  activeTopic = t === '' ? null : (activeTopic === t ? null : t);
  render();
});

$('notes').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const art = e.target.closest('.note');
  const id = art && art.getAttribute('data-id');
  const act = btn.getAttribute('data-act');
  if (act === 'more') {
    const body = art.querySelector('.note-body');
    const full = body.getAttribute('data-full');
    const expanded = btn.textContent === 'weniger anzeigen';
    body.textContent = expanded ? full.slice(0, 220).replace(/\s+\S*$/, '') + '…' : full;
    btn.textContent = expanded ? 'mehr anzeigen' : 'weniger anzeigen';
    return;
  }
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return;
  if (act === 'pin') { notes[idx].pinned = !notes[idx].pinned; }
  if (act === 'del') { if (!confirm('Diese Notiz löschen?')) return; notes.splice(idx, 1); }
  persist(); render();
});

$('exportBtn').addEventListener('click', () => {
  if (!notes.length) { toast('Noch nichts zu exportieren.', 'err'); return; }
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'twin-notizen-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Export gestartet.', 'ok');
});

if (!SR) $('recHint').textContent = 'Live-Spracherkennung hier nicht verfügbar — tippe deine Notiz unten ein.';

// ── 7. Start ──────────────────────────────────────────────────
render();

// PWA — Service Worker (nur im sicheren Kontext / über Server)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
