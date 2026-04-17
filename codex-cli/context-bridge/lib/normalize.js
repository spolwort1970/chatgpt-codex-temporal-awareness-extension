"use strict";

const { resolveNotes } = require("./default-notes");

function buildTimestampLine(time) {
  const abbreviation = time.abbreviation || time.timezone || "local";
  return `${time.timestamp} ${abbreviation}`;
}

function buildTimeNowValue(time) {
  if (time.timestamp && time.offset) {
    return `${time.timestamp.replace(" ", "T")}${time.offset}`;
  }

  if (time.iso8601) {
    return time.iso8601;
  }

  return time.timestamp;
}

function normalizeContext(collected, options) {
  const tools = {
    "time.now": buildTimeNowValue(collected.time),
    timezone: collected.time.timezone || collected.time.timezone_name
  };

  if (options.mode === "extended") {
    tools.hostname = collected.hostname;
    tools.platform = collected.platform;
    tools.cwd = collected.cwd;
  }

  return {
    timestamp: buildTimestampLine(collected.time),
    source: collected.source,
    version: collected.version,
    tools,
    notes: resolveNotes(options.notes, collected.timeSource)
  };
}

module.exports = {
  normalizeContext
};
