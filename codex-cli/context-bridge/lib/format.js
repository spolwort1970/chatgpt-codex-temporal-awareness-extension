"use strict";

function appendSection(lines, name, values) {
  const entries = Object.entries(values).filter(([, value]) => value);

  if (entries.length === 0) {
    return;
  }

  lines.push(`${name}:`);

  for (const [key, value] of entries) {
    lines.push(`  ${key}: ${value}`);
  }
}

function appendNotes(lines, notes) {
  if (!Array.isArray(notes) || notes.length === 0) {
    return;
  }

  lines.push("notes:");

  for (const note of notes) {
    lines.push(`  - ${note}`);
  }
}

function formatContextBlock(data) {
  const lines = [
    "[CTX]",
    `timestamp: ${data.timestamp}`,
    `source: ${data.source}`,
    `version: ${data.version}`
  ];

  appendSection(lines, "tools", data.tools);
  appendNotes(lines, data.notes);
  lines.push("[/CTX]");

  return lines.join("\n");
}

module.exports = {
  formatContextBlock
};
