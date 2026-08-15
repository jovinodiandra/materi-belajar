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
