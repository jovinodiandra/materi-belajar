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
