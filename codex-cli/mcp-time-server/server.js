"use strict";

const SERVER_NAME = "time-helper";
const SERVER_VERSION = "0.2.0";
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

let inputBuffer = Buffer.alloc(0);
let transportMode = null;

function getTimezoneAbbreviation(name) {
  if (!name) {
    return "";
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getLocalTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function normalizeDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }

  return date;
}

function validateTimezone(timezone) {
  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: timezone
    }).format(new Date());
    return timezone;
  } catch (error) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
}

function toIsoDate(date, timezone) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function toIsoTime(date, timezone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

function getTimezoneName(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "long"
  }).formatToParts(date);
  const zoneNamePart = parts.find((part) => part.type === "timeZoneName");
  return zoneNamePart ? zoneNamePart.value : timezone;
}

function getOffsetString(date, timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset"
  });
  const parts = formatter.formatToParts(date);
  const zoneNamePart = parts.find((part) => part.type === "timeZoneName");

  if (!zoneNamePart) {
    return "+00:00";
  }

  if (zoneNamePart.value === "GMT") {
    return "+00:00";
  }

  const match = zoneNamePart.value.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return "+00:00";
  }

  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = (match[3] || "00").padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function offsetStringToMinutes(offset) {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid offset: ${offset}`);
  }

  const sign = match[1] === "+" ? 1 : -1;
  return sign * ((Number(match[2]) * 60) + Number(match[3]));
}

function getDateTimeParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function getCurrentTimePayload(date = new Date(), timezone = getLocalTimezone()) {
  const normalizedDate = normalizeDate(date);
  const validatedTimezone = validateTimezone(timezone);
  const datePart = toIsoDate(normalizedDate, validatedTimezone);
  const timePart = toIsoTime(normalizedDate, validatedTimezone);
  const timezoneName = getTimezoneName(normalizedDate, validatedTimezone);
  const abbreviation = getTimezoneAbbreviation(timezoneName);
  const display = `[${datePart} ${timePart} ${abbreviation}] (${timezoneName})`;

  return {
    timestamp: `${datePart} ${timePart}`,
    abbreviation,
    timezone_name: timezoneName,
    timezone: validatedTimezone,
    offset: getOffsetString(normalizedDate, validatedTimezone),
    iso8601: normalizedDate.toISOString(),
    display
  };
}

function parseDateInput(value, defaultTimezone = getLocalTimezone()) {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return normalizeDate(value);
  }

  if (typeof value !== "string") {
    throw new Error("Expected a date string");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return new Date();
  }

  if (ISO_DATE_RE.test(trimmed)) {
    return parseNaiveDateTimeInTimezone(`${trimmed}T00:00:00`, defaultTimezone);
  }

  if (ISO_DATE_TIME_RE.test(trimmed)) {
    return parseNaiveDateTimeInTimezone(trimmed, defaultTimezone);
  }

  const lowered = trimmed.toLowerCase();
  if (lowered === "today" || lowered === "now") {
    return new Date();
  }
  if (lowered === "tomorrow") {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (lowered === "yesterday") {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  }

  const relativeMatch = lowered.match(/^in (\d+) (second|seconds|minute|minutes|hour|hours|day|days|week|weeks)$/);
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2];
    return addToDate(new Date(), amount, unit);
  }

  const agoMatch = lowered.match(/^(\d+) (second|seconds|minute|minutes|hour|hours|day|days|week|weeks) ago$/);
  if (agoMatch) {
    const amount = Number(agoMatch[1]);
    const unit = agoMatch[2];
    return addToDate(new Date(), -amount, unit);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Unable to parse date: ${value}`);
  }

  if (defaultTimezone) {
    validateTimezone(defaultTimezone);
  }

  return parsed;
}

function parseNaiveDateTimeInTimezone(value, timezone) {
  const validatedTimezone = validateTimezone(timezone);
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    throw new Error(`Unable to parse date: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || "00");
  const intendedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utcMs = intendedAsUtc;

  for (let index = 0; index < 2; index += 1) {
    const actualParts = getDateTimeParts(new Date(utcMs), validatedTimezone);
    const actualAsUtc = Date.UTC(
      actualParts.year,
      actualParts.month - 1,
      actualParts.day,
      actualParts.hour,
      actualParts.minute,
      actualParts.second
    );
    const delta = actualAsUtc - intendedAsUtc;
    if (delta === 0) {
      break;
    }
    utcMs -= delta;
  }

  return new Date(utcMs);
}

function addToDate(date, amount, unit) {
  const result = new Date(date.getTime());
  switch (unit) {
    case "second":
    case "seconds":
      result.setSeconds(result.getSeconds() + amount);
      return result;
    case "minute":
    case "minutes":
      result.setMinutes(result.getMinutes() + amount);
      return result;
    case "hour":
    case "hours":
      result.setHours(result.getHours() + amount);
      return result;
    case "day":
    case "days":
      result.setDate(result.getDate() + amount);
      return result;
    case "week":
    case "weeks":
      result.setDate(result.getDate() + (amount * 7));
      return result;
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

function formatDuration(ms) {
  const future = ms >= 0;
  let remainingSeconds = Math.abs(Math.round(ms / 1000));
  const days = Math.floor(remainingSeconds / 86400);
  remainingSeconds -= days * 86400;
  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds -= hours * 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds - (minutes * 60);
  const parts = [];

  if (days) {
    parts.push(`${days} day${days === 1 ? "" : "s"}`);
  }
  if (hours) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }
  if (minutes) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }
  if (seconds || parts.length === 0) {
    parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
  }

  return future ? `in ${parts.join(", ")}` : `${parts.join(", ")} ago`;
}

function getWeekday(date, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long"
  }).format(date);
}

function buildTextResult(text, structuredContent) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ],
    structuredContent
  };
}

const tools = {
  current_time: {
    description: "Returns the current local timestamp for this machine as part of the temporal utility set.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    },
    execute() {
      const payload = getCurrentTimePayload();
      return buildTextResult(payload.display, payload);
    }
  },
  format_time: {
    description: "Formats a supplied date/time for a target timezone.",
    inputSchema: {
      type: "object",
      properties: {
        datetime: {
          type: "string",
          description: "Date/time to format. Accepts ISO-like strings, or relative values like 'tomorrow'."
        },
        timezone: {
          type: "string",
          description: "IANA timezone name such as America/Los_Angeles."
        }
      },
      additionalProperties: false
    },
    execute(args) {
      const timezone = validateTimezone(args && args.timezone ? args.timezone : getLocalTimezone());
      const date = parseDateInput(args && args.datetime, timezone);
      const payload = getCurrentTimePayload(date, timezone);
      return buildTextResult(payload.display, payload);
    }
  },
  convert_timezone: {
    description: "Converts a supplied date/time into another timezone.",
    inputSchema: {
      type: "object",
      properties: {
        datetime: {
          type: "string",
          description: "Date/time to convert."
        },
        from_timezone: {
          type: "string",
          description: "Source IANA timezone. Used for interpretation guidance."
        },
        to_timezone: {
          type: "string",
          description: "Destination IANA timezone."
        }
      },
      required: ["datetime", "to_timezone"],
      additionalProperties: false
    },
    execute(args) {
      const fromTimezone = args && args.from_timezone ? validateTimezone(args.from_timezone) : getLocalTimezone();
      const toTimezone = validateTimezone(args.to_timezone);
      const date = parseDateInput(args.datetime, fromTimezone);
      const payload = getCurrentTimePayload(date, toTimezone);
      return buildTextResult(payload.display, {
        source_timezone: fromTimezone,
        ...payload
      });
    }
  },
  time_until: {
    description: "Returns the time remaining until a supplied date/time.",
    inputSchema: {
      type: "object",
      properties: {
        datetime: {
          type: "string",
          description: "Target date/time."
        }
      },
      required: ["datetime"],
      additionalProperties: false
    },
    execute(args) {
      const target = parseDateInput(args.datetime);
      const now = new Date();
      const deltaMs = target.getTime() - now.getTime();
      const payload = {
        now_iso8601: now.toISOString(),
        target_iso8601: target.toISOString(),
        delta_ms: deltaMs,
        human_readable: formatDuration(deltaMs)
      };
      return buildTextResult(payload.human_readable, payload);
    }
  },
  day_of_week: {
    description: "Returns the weekday for a supplied date in a target timezone.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to inspect."
        },
        timezone: {
          type: "string",
          description: "IANA timezone name."
        }
      },
      required: ["date"],
      additionalProperties: false
    },
    execute(args) {
      const timezone = validateTimezone(args && args.timezone ? args.timezone : getLocalTimezone());
      const date = parseDateInput(args.date, timezone);
      const weekday = getWeekday(date, timezone);
      const payload = {
        date: toIsoDate(date, timezone),
        weekday,
        timezone
      };
      return buildTextResult(weekday, payload);
    }
  },
  is_dst: {
    description: "Reports whether a timezone is observing daylight saving time on a supplied date.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date to inspect. Defaults to now."
        },
        timezone: {
          type: "string",
          description: "IANA timezone name. Defaults to the machine timezone."
        }
      },
      additionalProperties: false
    },
    execute(args) {
      const timezone = validateTimezone(args && args.timezone ? args.timezone : getLocalTimezone());
      const date = parseDateInput(args && args.date, timezone);
      const year = Number(toIsoDate(date, timezone).slice(0, 4));
      const januaryOffset = getOffsetString(new Date(Date.UTC(year, 0, 1, 12, 0, 0)), timezone);
      const julyOffset = getOffsetString(new Date(Date.UTC(year, 6, 1, 12, 0, 0)), timezone);
      const currentOffset = getOffsetString(date, timezone);
      const januaryMinutes = offsetStringToMinutes(januaryOffset);
      const julyMinutes = offsetStringToMinutes(julyOffset);
      const currentMinutes = offsetStringToMinutes(currentOffset);
      const observesDst = januaryOffset !== julyOffset;
      const dstMinutes = Math.max(januaryMinutes, julyMinutes);
      const dstActive = observesDst && currentMinutes === dstMinutes;
      const payload = {
        timezone,
        date: toIsoDate(date, timezone),
        observes_dst: observesDst,
        is_dst: Boolean(dstActive),
        offset: currentOffset
      };
      return buildTextResult(payload.is_dst ? "true" : "false", payload);
    }
  },
  parse_relative_date: {
    description: "Parses relative expressions like 'tomorrow' or 'in 3 days' into an absolute timestamp.",
    inputSchema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Relative date expression."
        },
        timezone: {
          type: "string",
          description: "IANA timezone name."
        }
      },
      required: ["expression"],
      additionalProperties: false
    },
    execute(args) {
      const timezone = validateTimezone(args && args.timezone ? args.timezone : getLocalTimezone());
      const date = parseDateInput(args.expression, timezone);
      const payload = getCurrentTimePayload(date, timezone);
      return buildTextResult(payload.display, {
        expression: args.expression,
        ...payload
      });
    }
  }
};

function writeMessage(message) {
  const json = JSON.stringify(message);

  if (transportMode === "line") {
    process.stdout.write(`${json}\n`);
    return;
  }

  const body = Buffer.from(json, "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  process.stdout.write(Buffer.concat([header, body]));
}

function writeResponse(id, result) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result
  });
}

function writeError(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message
    }
  });
}

function handleInitialize(id) {
  writeResponse(id, {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION
    }
  });
}

function handleToolsList(id) {
  writeResponse(id, {
    tools: Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  });
}

function handleToolsCall(id, params) {
  const toolName = params && params.name;
  const tool = tools[toolName];

  if (!tool) {
    writeError(id, -32601, `Unknown tool: ${toolName}`);
    return;
  }

  try {
    const result = tool.execute(params && params.arguments ? params.arguments : {});
    writeResponse(id, result);
  } catch (error) {
    writeError(id, -32000, error.message);
  }
}

function handleResourcesList(id) {
  writeResponse(id, {
    resources: []
  });
}

function handleResourceTemplatesList(id) {
  writeResponse(id, {
    resourceTemplates: []
  });
}

function handleRequest(message) {
  switch (message.method) {
    case "initialize":
      handleInitialize(message.id);
      return;
    case "tools/list":
      handleToolsList(message.id);
      return;
    case "tools/call":
      handleToolsCall(message.id, message.params);
      return;
    case "resources/list":
      handleResourcesList(message.id);
      return;
    case "resources/templates/list":
      handleResourceTemplatesList(message.id);
      return;
    case "notifications/initialized":
      return;
    default:
      if (Object.prototype.hasOwnProperty.call(message, "id")) {
        writeError(message.id, -32601, `Method not found: ${message.method}`);
      }
  }
}

function tryParseMessages() {
  while (true) {
    if (transportMode !== "framed") {
      const lineEnd = inputBuffer.indexOf("\n");
      if (lineEnd !== -1) {
        const line = inputBuffer.slice(0, lineEnd).toString("utf8").trim();

        if (line) {
          transportMode = "line";
          inputBuffer = inputBuffer.slice(lineEnd + 1);
          handleRequest(JSON.parse(line));
          continue;
        }

        inputBuffer = inputBuffer.slice(lineEnd + 1);
        continue;
      }
    }

    let headerEnd = inputBuffer.indexOf("\r\n\r\n");
    let headerDelimiterLength = 4;

    if (headerEnd === -1) {
      headerEnd = inputBuffer.indexOf("\n\n");
      headerDelimiterLength = 2;
    }

    if (headerEnd === -1) {
      return;
    }

    transportMode = "framed";

    const headerText = inputBuffer.slice(0, headerEnd).toString("utf8");
    const contentLengthHeader = headerText
      .split(/\r?\n/)
      .find((line) => line.toLowerCase().startsWith("content-length:"));

    if (!contentLengthHeader) {
      throw new Error("Missing Content-Length header");
    }

    const contentLength = Number(contentLengthHeader.split(":")[1].trim());
    const messageStart = headerEnd + headerDelimiterLength;
    const messageEnd = messageStart + contentLength;

    if (inputBuffer.length < messageEnd) {
      return;
    }

    const body = inputBuffer.slice(messageStart, messageEnd).toString("utf8");
    inputBuffer = inputBuffer.slice(messageEnd);
    handleRequest(JSON.parse(body));
  }
}

process.stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);

  try {
    tryParseMessages();
  } catch (error) {
    process.stderr.write(`mcp-time-server error: ${error.message}\n`);
  }
});

process.stdin.on("end", () => {
  process.exit(0);
});
