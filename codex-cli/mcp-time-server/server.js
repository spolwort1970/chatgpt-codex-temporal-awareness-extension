"use strict";

const TOOL_NAME = "current_time";
const SERVER_NAME = "time-helper";
const SERVER_VERSION = "0.1.0";

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

function getCurrentTimePayload() {
  const now = new Date();
  const datePart = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);

  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffsetMinutes / 60)).padStart(2, "0");
  const offsetRemainder = String(absOffsetMinutes % 60).padStart(2, "0");
  const offset = `${sign}${offsetHours}:${offsetRemainder}`;

  const daylightName = now.toLocaleDateString("en-US", {
    timeZoneName: "long"
  }).split(", ").pop();
  const abbreviation = getTimezoneAbbreviation(daylightName);
  const bracketed = `[${datePart} ${timePart} ${abbreviation}] (${daylightName})`;

  return {
    timestamp: `${datePart} ${timePart}`,
    abbreviation,
    timezone_name: daylightName,
    timezone: zone,
    offset,
    iso8601: now.toISOString(),
    display: bracketed
  };
}

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
    tools: [
      {
        name: TOOL_NAME,
        description: "Returns the current local timestamp for this machine.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ]
  });
}

function handleToolsCall(id, params) {
  const toolName = params && params.name;

  if (toolName !== TOOL_NAME) {
    writeError(id, -32601, `Unknown tool: ${toolName}`);
    return;
  }

  const payload = getCurrentTimePayload();

  writeResponse(id, {
    content: [
      {
        type: "text",
        text: payload.display
      }
    ],
    structuredContent: payload
  });
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
