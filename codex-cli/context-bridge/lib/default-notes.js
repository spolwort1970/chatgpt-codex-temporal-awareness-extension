"use strict";

const MAX_NOTES = 3;
const MAX_NOTE_LENGTH = 80;

function sanitizeNote(note) {
  const compact = String(note || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact) {
    return null;
  }

  return compact.slice(0, MAX_NOTE_LENGTH);
}

function buildDefaultNotes(timeSource) {
  if (timeSource === "node") {
    return ["Using Node fallback time"];
  }

  if (timeSource === "helper") {
    return ["Using local helper time"];
  }

  return ["Timestamp is authoritative"];
}

function resolveNotes(inputNotes, timeSource) {
  const baseNotes = Array.isArray(inputNotes) && inputNotes.length > 0 ? inputNotes : buildDefaultNotes(timeSource);
  const seen = new Set();
  const resolved = [];

  for (const note of baseNotes) {
    const sanitized = sanitizeNote(note);

    if (!sanitized) {
      continue;
    }

    const key = sanitized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    resolved.push(sanitized);

    if (resolved.length >= MAX_NOTES) {
      break;
    }
  }

  return resolved;
}

module.exports = {
  resolveNotes
};
