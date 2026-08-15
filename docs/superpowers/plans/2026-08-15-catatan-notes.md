# Catatan (Notes) Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Mac Notes–style "Catatan" (notes) feature to the static "Materi Belajar" site: a card grid of notes (title + description) that opens into a full-screen editor (title, description, body) with auto-save and delete, all persisted in the browser via `localStorage`.

**Architecture:** A new self-contained page at `catatan/index.html` (HTML + embedded CSS + a small inline script) that toggles between two views (grid / full-screen editor) inside a single page — no routing, no reload. Pure data-manipulation logic (id generation, sorting, parsing, editing) lives in a separate `catatan/notes-core.js` module so it can be unit-tested with Node's built-in test runner, independent of the DOM/`localStorage`. The root `index.html` gets one new link into this page. Visual design reuses the existing site's CSS custom properties and dark/light theme mechanism (`data-theme` attribute + `localStorage['materi-theme']`) so the new page matches the rest of the site automatically.

**Tech Stack:** Plain HTML/CSS/vanilla JS (no build step, matching the rest of the repo), `localStorage` for persistence, Node's built-in `node:test`/`node:assert` for unit tests of the pure logic module (Node v20 is available; no new dependencies or `package.json` needed).

---

## Reference: full data model

Every note is an object:

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "body": "string",
  "createdAt": "ISO-8601 string",
  "updatedAt": "ISO-8601 string"
}
```

Stored as a JSON array under `localStorage` key `materi-notes`.

---

### Task 1: Pure notes logic module (TDD)

**Files:**
- Create: `catatan/notes-core.js`
- Test: `catatan/notes-core.test.js`

This module has zero DOM/`localStorage` dependency, so it can be tested directly with Node.

- [ ] **Step 1: Write the failing tests**

Create `catatan/notes-core.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const NotesCore = require('./notes-core.js');

test('generateId returns unique non-empty strings', () => {
  const a = NotesCore.generateId();
  const b = NotesCore.generateId();
  assert.notEqual(a, b);
  assert.ok(a.length > 0);
});

test('parseStoredNotes returns [] for null input', () => {
  assert.deepEqual(NotesCore.parseStoredNotes(null), []);
});

test('parseStoredNotes returns [] for invalid JSON', () => {
  assert.deepEqual(NotesCore.parseStoredNotes('{not valid json'), []);
});

test('parseStoredNotes returns [] when parsed value is not an array', () => {
  assert.deepEqual(NotesCore.parseStoredNotes('{"a":1}'), []);
});

test('parseStoredNotes returns the array when JSON is a valid array', () => {
  const raw = JSON.stringify([{ id: '1' }]);
  assert.deepEqual(NotesCore.parseStoredNotes(raw), [{ id: '1' }]);
});

test('sortByUpdatedDesc orders notes from newest updatedAt to oldest', () => {
  const notes = [
    { id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', updatedAt: '2026-03-01T00:00:00.000Z' },
    { id: 'c', updatedAt: '2026-02-01T00:00:00.000Z' }
  ];
  const sorted = NotesCore.sortByUpdatedDesc(notes);
  assert.deepEqual(sorted.map(n => n.id), ['b', 'c', 'a']);
});

test('sortByUpdatedDesc does not mutate the original array', () => {
  const notes = [
    { id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', updatedAt: '2026-02-01T00:00:00.000Z' }
  ];
  NotesCore.sortByUpdatedDesc(notes);
  assert.deepEqual(notes.map(n => n.id), ['a', 'b']);
});

test('createNoteObject builds an empty note skeleton with given id and timestamp', () => {
  const note = NotesCore.createNoteObject('id-1', '2026-08-15T00:00:00.000Z');
  assert.deepEqual(note, {
    id: 'id-1',
    title: '',
    description: '',
    body: '',
    createdAt: '2026-08-15T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z'
  });
});

test('findNoteById returns the matching note', () => {
  const notes = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(NotesCore.findNoteById(notes, 'b'), { id: 'b' });
});

test('findNoteById returns null when no note matches', () => {
  const notes = [{ id: 'a' }];
  assert.equal(NotesCore.findNoteById(notes, 'missing'), null);
});

test('removeNoteById returns a new array without the matching note', () => {
  const notes = [{ id: 'a' }, { id: 'b' }];
  const result = NotesCore.removeNoteById(notes, 'a');
  assert.deepEqual(result, [{ id: 'b' }]);
  assert.equal(notes.length, 2);
});

test('applyNoteEdit updates only the given fields and refreshes updatedAt', () => {
  const note = {
    id: '1',
    title: 'Old',
    description: 'Old desc',
    body: 'Old body',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
  const result = NotesCore.applyNoteEdit(note, { title: 'New' }, '2026-08-15T00:00:00.000Z');
  assert.deepEqual(result, {
    id: '1',
    title: 'New',
    description: 'Old desc',
    body: 'Old body',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-08-15T00:00:00.000Z'
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test catatan/notes-core.test.js`
Expected: FAIL — `Cannot find module './notes-core.js'` (the module doesn't exist yet).

- [ ] **Step 3: Implement the module**

Create `catatan/notes-core.js`:

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NotesCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  "use strict";

  function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function parseStoredNotes(raw) {
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function sortByUpdatedDesc(notes) {
    return notes.slice().sort(function (a, b) {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  function createNoteObject(id, now) {
    return { id: id, title: '', description: '', body: '', createdAt: now, updatedAt: now };
  }

  function findNoteById(notes, id) {
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].id === id) return notes[i];
    }
    return null;
  }

  function removeNoteById(notes, id) {
    return notes.filter(function (n) { return n.id !== id; });
  }

  function applyNoteEdit(note, fields, now) {
    return {
      id: note.id,
      title: 'title' in fields ? fields.title : note.title,
      description: 'description' in fields ? fields.description : note.description,
      body: 'body' in fields ? fields.body : note.body,
      createdAt: note.createdAt,
      updatedAt: now
    };
  }

  return {
    generateId: generateId,
    parseStoredNotes: parseStoredNotes,
    sortByUpdatedDesc: sortByUpdatedDesc,
    createNoteObject: createNoteObject,
    findNoteById: findNoteById,
    removeNoteById: removeNoteById,
    applyNoteEdit: applyNoteEdit
  };
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test catatan/notes-core.test.js`
Expected: PASS — all 11 tests green, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add catatan/notes-core.js catatan/notes-core.test.js
git commit -m "$(cat <<'EOF'
Add pure notes data-logic module with unit tests

Covers id generation, localStorage-safe parsing, sorting, and
note creation/edit/lookup/removal — no DOM dependency, so it's
testable with Node directly.
EOF
)"
```

---

### Task 2: `catatan/index.html` skeleton (structure, styling, theming)

**Files:**
- Create: `catatan/index.html`

No interactivity yet in this task beyond the site's existing theme-init pattern — this is markup + CSS only, so the page looks right before behavior is wired up.

- [ ] **Step 1: Create the file**

Create `catatan/index.html`:

```html
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catatan — Materi Belajar</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

  :root {
    --bg: #f7f6f1;
    --bg-2: #ffffff;
    --card: #ffffff;
    --line: #e5e2d6;
    --line-soft: #eeece1;
    --ink: #232320;
    --ink-soft: #57564f;
    --muted: #8a887d;
    --accent: #2f6fed;
    --accent-dim: #1b4fbf;
    --accent-bg: rgba(47, 111, 237, .08);
    --bad: #d64545;
    --bad-bg: rgba(214, 69, 69, .08);
    --sans: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: "SF Mono", "Consolas", "Liberation Mono", Menlo, "DejaVu Sans Mono", monospace;
    --maxw: 1180px;
    --radius: 14px;
  }

  [data-theme="dark"] {
    --bg: #0e1015;
    --bg-2: #14171e;
    --card: #161a22;
    --line: #262b35;
    --line-soft: #1d212a;
    --ink: #e6e7ea;
    --ink-soft: #b7bac2;
    --muted: #767b87;
    --accent: #6f9bff;
    --accent-dim: #9bb8ff;
    --accent-bg: rgba(111, 155, 255, .12);
    --bad: #e0685f;
    --bad-bg: rgba(224, 104, 95, .12);
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0e1015;
      --bg-2: #14171e;
      --card: #161a22;
      --line: #262b35;
      --line-soft: #1d212a;
      --ink: #e6e7ea;
      --ink-soft: #b7bac2;
      --muted: #767b87;
      --accent: #6f9bff;
      --accent-dim: #9bb8ff;
      --accent-bg: rgba(111, 155, 255, .12);
      --bad: #e0685f;
      --bad-bg: rgba(224, 104, 95, .12);
    }
  }

  body {
    background: var(--bg);
    color: var(--ink);
    font-family: var(--sans);
    line-height: 1.6;
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; }

  .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 clamp(16px, 4vw, 40px); }

  header.top {
    position: sticky; top: 0; z-index: 40;
    background: var(--bg-2);
    border-bottom: 1px solid var(--line);
    backdrop-filter: blur(8px);
  }

  .topbar {
    display: flex; align-items: center; gap: 14px;
    padding: 14px clamp(16px, 4vw, 40px);
    max-width: var(--maxw); margin: 0 auto;
  }

  .brand { font-family: var(--mono); font-size: 13px; letter-spacing: .04em; color: var(--muted); white-space: nowrap; }
  .brand b { color: var(--ink); font-weight: 700; }

  .topbar .spacer { flex: 1; }

  .back-link {
    display: none;
    align-items: center; gap: 6px;
    font-family: var(--mono); font-size: 13px; color: var(--ink-soft);
    text-decoration: none; padding: 7px 12px; border: 1px solid var(--line); border-radius: 9px;
    background: transparent; cursor: pointer;
  }
  .back-link:hover { color: var(--accent); border-color: var(--accent); }

  .theme-btn {
    flex: none; display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px; border: 1px solid var(--line); border-radius: 9px;
    background: transparent; color: var(--ink-soft); cursor: pointer;
  }
  .theme-btn:hover { color: var(--accent); border-color: var(--accent); }
  .theme-btn .ic-sun { display: none; }
  [data-theme="dark"] .theme-btn .ic-sun { display: inline; }
  [data-theme="dark"] .theme-btn .ic-moon { display: none; }

  main { padding: 32px 0 60px; }

  .page-head {
    display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;
    flex-wrap: wrap; margin-bottom: 24px;
  }
  .page-head h1 { font-size: clamp(24px, 3.4vw, 32px); font-weight: 700; letter-spacing: -.01em; }
  .page-head p { color: var(--muted); font-size: 14.5px; margin-top: 4px; }

  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: var(--sans); font-size: 14.5px; font-weight: 600;
    color: #fff; background: var(--accent); border: none; border-radius: 10px;
    padding: 10px 18px; cursor: pointer; white-space: nowrap;
  }
  .btn:hover { background: var(--accent-dim); }

  .notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }

  .note-card {
    position: relative; text-align: left;
    background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
    padding: 18px 18px 16px; cursor: pointer;
    font-family: inherit; color: inherit;
    transition: border-color .15s, transform .15s;
  }
  .note-card:hover { border-color: var(--accent-dim); transform: translateY(-2px); }

  .note-card__title {
    font-size: 16.5px; font-weight: 700; margin-right: 26px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .note-card__desc {
    margin-top: 6px; font-size: 14px; color: var(--ink-soft);
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  }
  .note-card__date { margin-top: 12px; font-family: var(--mono); font-size: 11.5px; color: var(--muted); }

  .note-card__del {
    position: absolute; top: 12px; right: 12px;
    width: 26px; height: 26px; border-radius: 8px;
    border: 1px solid var(--line); background: var(--bg-2); color: var(--muted);
    font-size: 13px; line-height: 1; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .note-card__del:hover { color: var(--bad); border-color: var(--bad); background: var(--bad-bg); }

  .empty-state { display: none; text-align: center; padding: 80px 20px; color: var(--muted); }
  .empty-state.show { display: block; }
  .empty-state p { margin-bottom: 20px; font-size: 15px; }

  .grid-view.hide, .editor-view.hide { display: none; }

  .editor-view { padding-top: 8px; }
  .editor-field { margin-bottom: 18px; }
  .editor-field label {
    display: block; font-family: var(--mono); font-size: 11.5px; letter-spacing: .06em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 6px;
  }
  .editor-title-input {
    width: 100%; border: none; border-bottom: 2px solid var(--line); background: transparent;
    color: var(--ink); font-size: 26px; font-weight: 700; font-family: var(--sans);
    padding: 6px 0; outline: none;
  }
  .editor-title-input:focus { border-color: var(--accent); }
  .editor-desc-input {
    width: 100%; border: 1px solid var(--line); border-radius: 10px; background: var(--card);
    color: var(--ink); font-size: 14.5px; font-family: var(--sans); padding: 10px 14px; outline: none;
  }
  .editor-desc-input:focus { border-color: var(--accent); }
  .editor-body-textarea {
    width: 100%; min-height: 360px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--card); color: var(--ink); font-size: 15px; font-family: var(--sans);
    line-height: 1.7; padding: 16px; outline: none; resize: vertical;
  }
  .editor-body-textarea:focus { border-color: var(--accent); }

  .editor-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
  .btn-del {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: var(--sans); font-size: 14px; font-weight: 600;
    color: var(--bad); background: var(--bad-bg); border: 1px solid var(--bad); border-radius: 10px;
    padding: 9px 16px; cursor: pointer;
  }
  .btn-del:hover { opacity: .85; }

  @media (max-width: 640px) {
    .page-head { flex-direction: column; align-items: flex-start; }
    .notes-grid { grid-template-columns: 1fr; }
    .editor-title-input { font-size: 22px; }
    .editor-body-textarea { min-height: 260px; }
  }

  a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px;
  }
</style>
<script>
  (function () {
    try {
      var t = localStorage.getItem('materi-theme');
      if (!t) {
        t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  })();
</script>
</head>
<body>

<a id="__exitbtn" href="../index.html" style="position:fixed;top:12px;right:12px;z-index:99999;font-family:system-ui,-apple-system,sans-serif;font-size:12px;color:#fff;background:rgba(20,20,30,.78);border:1px solid rgba(255,255,255,.28);border-radius:8px;padding:6px 13px;text-decoration:none;backdrop-filter:blur(6px)">✕ Keluar</a>

<header class="top">
  <div class="topbar">
    <div class="brand">📝 <b>Catatan</b></div>
    <button id="backBtn" class="back-link" type="button">← Kembali</button>
    <div class="spacer"></div>
    <button id="themeToggle" class="theme-btn" type="button" aria-label="Ganti tema" title="Tema terang / gelap">
      <svg class="ic-moon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
      <svg class="ic-sun" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
    </button>
  </div>
</header>

<main>
  <div class="wrap grid-view" id="gridView">
    <div class="page-head">
      <div>
        <h1>Catatan Saya</h1>
        <p>Pengetahuan baru &amp; hal penting dari materi yang kamu pelajari.</p>
      </div>
      <button class="btn" id="newNoteBtn" type="button">+ Catatan Baru</button>
    </div>

    <div class="notes-grid" id="notesGrid"></div>

    <div class="empty-state" id="emptyState">
      <p>Belum ada catatan.</p>
      <button class="btn" id="emptyNewNoteBtn" type="button">+ Buat Catatan Pertama</button>
    </div>
  </div>

  <div class="wrap editor-view hide" id="editorView">
    <div class="editor-field">
      <label for="titleInput">Judul</label>
      <input id="titleInput" class="editor-title-input" type="text" placeholder="Judul catatan…" autocomplete="off">
    </div>
    <div class="editor-field">
      <label for="descInput">Deskripsi</label>
      <input id="descInput" class="editor-desc-input" type="text" placeholder="Deskripsi singkat…" autocomplete="off">
    </div>
    <div class="editor-field">
      <label for="bodyInput">Isi Catatan</label>
      <textarea id="bodyInput" class="editor-body-textarea" placeholder="Tulis catatanmu di sini…"></textarea>
    </div>
    <div class="editor-actions">
      <button class="btn-del" id="deleteNoteBtn" type="button">🗑 Hapus Catatan</button>
    </div>
  </div>
</main>

</body>
</html>
```

- [ ] **Step 2: Verify visually**

Run: `open catatan/index.html` (macOS) or drag the file into a browser tab.
Expected: page shows the "Catatan Saya" header, an empty grid area, and the empty-state message with a "+ Buat Catatan Pertama" button. The topbar shows a theme toggle button (not yet clickable) and the site's "✕ Keluar" exit button top-right that returns to `../index.html`. Resize the window narrow (~375px) — layout should stay single-column and readable, no horizontal scrollbar.

- [ ] **Step 3: Commit**

```bash
git add catatan/index.html
git commit -m "$(cat <<'EOF'
Add Catatan page skeleton (structure, styling, theming)

Static markup and CSS for the notes grid and full-screen editor
views, reusing the site's existing design tokens and dark/light
theme mechanism. No interactivity yet.
EOF
)"
```

---

### Task 3: Rendering, view switching, and note creation

**Files:**
- Modify: `catatan/index.html` (add a script block before `</body>`)

- [ ] **Step 1: Add the rendering/navigation script**

In `catatan/index.html`, replace the closing:

```html
</main>

</body>
</html>
```

with:

```html
</main>

<script src="notes-core.js"></script>
<script>
  (function () {
    "use strict";
    var STORAGE_KEY = 'materi-notes';
    var notes = NotesCore.parseStoredNotes(safeGetItem());
    var currentId = null;

    var gridView = document.getElementById('gridView');
    var editorView = document.getElementById('editorView');
    var notesGrid = document.getElementById('notesGrid');
    var emptyState = document.getElementById('emptyState');
    var backBtn = document.getElementById('backBtn');
    var newNoteBtn = document.getElementById('newNoteBtn');
    var emptyNewNoteBtn = document.getElementById('emptyNewNoteBtn');
    var titleInput = document.getElementById('titleInput');
    var descInput = document.getElementById('descInput');
    var bodyInput = document.getElementById('bodyInput');

    function safeGetItem() {
      try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
    }

    function persist() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch (e) {}
    }

    function formatDate(iso) {
      var d = new Date(iso);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str || '';
      return div.innerHTML;
    }

    function renderGrid() {
      var sorted = NotesCore.sortByUpdatedDesc(notes);
      notesGrid.innerHTML = '';
      sorted.forEach(function (note) {
        var card = document.createElement('div');
        card.className = 'note-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML =
          '<button class="note-card__del" type="button" aria-label="Hapus catatan" data-id="' + note.id + '">✕</button>' +
          '<div class="note-card__title">' + (escapeHtml(note.title) || 'Tanpa judul') + '</div>' +
          '<div class="note-card__desc">' + escapeHtml(note.description) + '</div>' +
          '<div class="note-card__date">' + formatDate(note.updatedAt) + '</div>';
        card.addEventListener('click', function (ev) {
          if (ev.target.closest('.note-card__del')) return;
          openEditor(note.id);
        });
        card.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            openEditor(note.id);
          }
        });
        notesGrid.appendChild(card);
      });
      emptyState.classList.toggle('show', sorted.length === 0);
    }

    function openEditor(id) {
      var note = NotesCore.findNoteById(notes, id);
      if (!note) return;
      currentId = id;
      titleInput.value = note.title;
      descInput.value = note.description;
      bodyInput.value = note.body;
      gridView.classList.add('hide');
      editorView.classList.remove('hide');
      backBtn.style.display = 'inline-flex';
      titleInput.focus();
    }

    function closeEditor() {
      currentId = null;
      gridView.classList.remove('hide');
      editorView.classList.add('hide');
      backBtn.style.display = 'none';
      renderGrid();
    }

    function createAndOpenNote() {
      var note = NotesCore.createNoteObject(NotesCore.generateId(), new Date().toISOString());
      notes.push(note);
      persist();
      openEditor(note.id);
    }

    newNoteBtn.addEventListener('click', createAndOpenNote);
    emptyNewNoteBtn.addEventListener('click', createAndOpenNote);
    backBtn.addEventListener('click', closeEditor);

    renderGrid();

    var themeBtn = document.getElementById('themeToggle');
    themeBtn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('materi-theme', next); } catch (e) {}
    });
  })();
</script>
</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Run: `open catatan/index.html`
Expected:
1. Click "+ Buat Catatan Pertama" (or "+ Catatan Baru") → editor view opens full-screen, "← Kembali" button appears in the topbar, title field is focused.
2. Type a title, click "← Kembali" → back at the grid, a card now shows the title (description empty, date shown).
3. Reload the page (`Cmd+R`) → the card is still there (confirms `localStorage` persistence).
4. Click the theme toggle button → page switches dark/light and stays switched after reload.
5. Click directly on a card (not the ✕) → editor opens with that note's saved title.

- [ ] **Step 3: Commit**

```bash
git add catatan/index.html
git commit -m "$(cat <<'EOF'
Wire up Catatan grid rendering and note creation

Grid renders cards from localStorage sorted by most-recently
updated, "+ Catatan Baru" creates a note and opens the full-screen
editor, and the back button returns to the grid. Theme toggle reuses
the site-wide dark/light pattern.
EOF
)"
```

---

### Task 4: Auto-save and delete

**Files:**
- Modify: `catatan/index.html`

- [ ] **Step 1: Add auto-save on field input**

In the script added in Task 3, add a debounced save timer and wire it to the three editor fields. Replace:

```js
    function closeEditor() {
      currentId = null;
      gridView.classList.remove('hide');
      editorView.classList.add('hide');
      backBtn.style.display = 'none';
      renderGrid();
    }

    function createAndOpenNote() {
```

with:

```js
    function closeEditor() {
      currentId = null;
      gridView.classList.remove('hide');
      editorView.classList.add('hide');
      backBtn.style.display = 'none';
      renderGrid();
    }

    var saveTimer = null;

    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveCurrentNote, 500);
    }

    function saveCurrentNote() {
      if (!currentId) return;
      var note = NotesCore.findNoteById(notes, currentId);
      if (!note) return;
      var updated = NotesCore.applyNoteEdit(note, {
        title: titleInput.value,
        description: descInput.value,
        body: bodyInput.value
      }, new Date().toISOString());
      notes = notes.map(function (n) { return n.id === currentId ? updated : n; });
      persist();
    }

    function createAndOpenNote() {
```

- [ ] **Step 2: Flush the pending save on back / unload, and bind field listeners**

Replace:

```js
    newNoteBtn.addEventListener('click', createAndOpenNote);
    emptyNewNoteBtn.addEventListener('click', createAndOpenNote);
    backBtn.addEventListener('click', closeEditor);

    renderGrid();
```

with:

```js
    newNoteBtn.addEventListener('click', createAndOpenNote);
    emptyNewNoteBtn.addEventListener('click', createAndOpenNote);
    backBtn.addEventListener('click', function () {
      clearTimeout(saveTimer);
      saveCurrentNote();
      closeEditor();
    });
    titleInput.addEventListener('input', scheduleSave);
    descInput.addEventListener('input', scheduleSave);
    bodyInput.addEventListener('input', scheduleSave);
    window.addEventListener('beforeunload', function () {
      if (currentId) {
        clearTimeout(saveTimer);
        saveCurrentNote();
      }
    });

    renderGrid();
```

- [ ] **Step 3: Add delete (with confirmation) from both the card and the editor**

Add a `deleteNoteBtn` reference and delete logic. Replace:

```js
    var backBtn = document.getElementById('backBtn');
    var newNoteBtn = document.getElementById('newNoteBtn');
    var emptyNewNoteBtn = document.getElementById('emptyNewNoteBtn');
    var titleInput = document.getElementById('titleInput');
    var descInput = document.getElementById('descInput');
    var bodyInput = document.getElementById('bodyInput');
```

with:

```js
    var backBtn = document.getElementById('backBtn');
    var newNoteBtn = document.getElementById('newNoteBtn');
    var emptyNewNoteBtn = document.getElementById('emptyNewNoteBtn');
    var titleInput = document.getElementById('titleInput');
    var descInput = document.getElementById('descInput');
    var bodyInput = document.getElementById('bodyInput');
    var deleteNoteBtn = document.getElementById('deleteNoteBtn');
```

Then add the delete handler wiring inside `renderGrid()` (for the card's ✕ button) — replace:

```js
        notesGrid.appendChild(card);
      });
      emptyState.classList.toggle('show', sorted.length === 0);
    }
```

with:

```js
        notesGrid.appendChild(card);
      });
      emptyState.classList.toggle('show', sorted.length === 0);

      notesGrid.querySelectorAll('.note-card__del').forEach(function (delBtn) {
        delBtn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          requestDelete(delBtn.getAttribute('data-id'));
        });
      });
    }

    function requestDelete(id) {
      if (!window.confirm('Hapus catatan ini? Tindakan ini tidak bisa dibatalkan.')) return;
      clearTimeout(saveTimer);
      notes = NotesCore.removeNoteById(notes, id);
      persist();
      if (currentId === id) {
        currentId = null;
        gridView.classList.remove('hide');
        editorView.classList.add('hide');
        backBtn.style.display = 'none';
        renderGrid();
      } else {
        renderGrid();
      }
    }
```

And finally wire the editor's own delete button — replace:

```js
    window.addEventListener('beforeunload', function () {
      if (currentId) {
        clearTimeout(saveTimer);
        saveCurrentNote();
      }
    });

    renderGrid();
```

with:

```js
    deleteNoteBtn.addEventListener('click', function () {
      if (currentId) requestDelete(currentId);
    });
    window.addEventListener('beforeunload', function () {
      if (currentId) {
        clearTimeout(saveTimer);
        saveCurrentNote();
      }
    });

    renderGrid();
```

- [ ] **Step 4: Verify in browser**

Run: `open catatan/index.html`
Expected:
1. Create a note, type a title/description/body, click "← Kembali" without waiting → change is saved (auto-save fired on `beforeunload`/back-click flush). Reload → content persisted.
2. Type into a field and wait ~1 second without clicking anything → reload the page → the change is still there (confirms the 500ms debounce actually persists on its own, not just on back-click).
3. Click the ✕ on a card in the grid → confirmation dialog appears → confirm → card disappears and stays gone after reload.
4. Click Cancel on the confirmation dialog → card remains.
5. Open a note, click "🗑 Hapus Catatan" inside the editor → confirmation appears → confirm → returns to grid, note gone.

- [ ] **Step 5: Commit**

```bash
git add catatan/index.html
git commit -m "$(cat <<'EOF'
Add auto-save and delete (with confirmation) to Catatan

Editor fields debounce-save to localStorage as you type, with a
flush on back/unload. Delete is available from both the card grid
and the editor, gated by a confirmation prompt.
EOF
)"
```

---

### Task 5: Entry point from the root page

**Files:**
- Modify: `index.html:292` (insert CSS after the `.t-advance` rule)
- Modify: `index.html:581-582` (insert the link inside the hero section)

- [ ] **Step 1: Add the CTA styling**

In `index.html`, after the `.t-advance` rule (ends at line 292) and before the `main` rule (starts at line 294), insert:

```css
        .notes-cta {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 20px;
            font-family: var(--sans);
            font-size: 14.5px;
            font-weight: 600;
            color: #fff;
            background: var(--accent);
            border-radius: 10px;
            padding: 10px 18px;
            text-decoration: none;
            white-space: nowrap
        }

        .notes-cta:hover {
            background: var(--accent-dim)
        }
```

- [ ] **Step 2: Add the link markup**

In `index.html`, inside the hero `<div class="tierlegend">...</div>` block (around line 577-582), add the link right after that block closes. Replace:

```html
        <div class="tierlegend">
            <span class="t-beginner">● Beginner</span>
            <span class="t-middle">● Middle</span>
            <span class="t-advance">● Advance</span>
            <span style="color:var(--muted)">Tiap topik yang tersedia mencakup ketiga level ini.</span>
        </div>
    </div>
```

with:

```html
        <div class="tierlegend">
            <span class="t-beginner">● Beginner</span>
            <span class="t-middle">● Middle</span>
            <span class="t-advance">● Advance</span>
            <span style="color:var(--muted)">Tiap topik yang tersedia mencakup ketiga level ini.</span>
        </div>

        <a class="notes-cta" href="catatan/index.html">📝 Buka Catatan Saya</a>
    </div>
```

- [ ] **Step 3: Verify in browser**

Run: `open index.html`
Expected: a blue "📝 Buka Catatan Saya" button/link appears below the Beginner/Middle/Advance legend in the hero section. Clicking it opens `catatan/index.html`. Clicking the "✕ Keluar" button on the Catatan page returns to this root page.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "$(cat <<'EOF'
Add entry point link to the new Catatan page from the homepage
EOF
)"
```

---

### Task 6: Full manual QA pass

**Files:** none (verification only; fix forward in the relevant file above if something breaks)

- [ ] **Step 1: Run the automated unit tests one more time**

Run: `node --test catatan/notes-core.test.js`
Expected: PASS — all tests green.

- [ ] **Step 2: Full flow QA in a real browser**

Open `index.html` at the repo root in a browser and walk through:
1. Click "📝 Buka Catatan Saya" from the homepage → lands on the empty Catatan page.
2. Create 3 notes with different titles/descriptions/bodies.
3. Confirm grid shows all 3, most-recently-edited first (edit the oldest one's title — it should jump to the top).
4. Edit a title from the grid → open note → change title → back → new title shown on card immediately.
5. Delete one note with confirmation → confirm it's gone from the grid and does not reappear on reload.
6. Cancel a delete confirmation → note remains.
7. Toggle dark/light theme on the Catatan page → toggle it again on the homepage → confirm both pages stay in sync (same `localStorage['materi-theme']` value).

- [ ] **Step 3: Responsive check**

Using browser dev tools device toolbar (or by resizing the window):
1. At ~375px width (phone): grid is single-column, "+ Catatan Baru" button and heading stack vertically without overlapping, editor view fields stack full-width, no horizontal scrollbar anywhere.
2. At ~768px width (tablet): grid shows 2-3 columns.
3. At ~1280px+ width (laptop/desktop): grid shows multiple columns, content stays within `--maxw` (1180px) and is centered.

- [ ] **Step 4: Fix any issues found**

If any step above fails, fix it in the relevant file (`catatan/index.html`, `catatan/notes-core.js`, or `index.html`) and commit the fix with a descriptive message, e.g.:

```bash
git add <changed files>
git commit -m "Fix <specific issue found during QA>"
```

If everything passes, no commit is needed for this task.
