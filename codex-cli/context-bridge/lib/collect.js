"use strict";

const os = require("os");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const CODEX_CLI_ROOT = path.resolve(__dirname, "..", "..");
const MCP_SERVER_PATH = path.join(CODEX_CLI_ROOT, "mcp-time-server", "server.js");
const REPO_HELPER_PATH = path.join(CODEX_CLI_ROOT, "time-helper", "current-time.cmd");
const INSTALLED_HELPER_PATH = "C:\\tools\\time-helper\\current-time.cmd";
const SOURCE = "mcp-bridge";
const VERSION = 1;

function createDebugLogger(enabled) {
  return {
    enabled,
    log(message) {
      if (!enabled) {
        return;
      }

      process.stderr.write(`[context-bridge] ${message}\n`);
    }
  };
}

function fileExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch (_error) {
    return false;
  }
}

function parseDisplayString(display) {
  const match = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) ([^\]]+)\] \((.+)\)$/.exec(
    String(display || "").trim()
  );

  if (!match) {
    return null;
  }

  return {
    timestamp: match[1],
    abbreviation: match[2],
    timezone_name: match[3]
  };
}

function getCurrentOffset() {
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function buildNodeTimePayload() {
  const now = new Date();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const zoneName = now
    .toLocaleDateString("en-US", { timeZoneName: "long" })
    .split(", ")
    .pop();
  const abbreviation = zoneName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join("");
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

  return {
    timestamp: `${datePart} ${timePart}`,
    abbreviation,
    timezone: zone,
    timezone_name: zoneName,
    offset: getCurrentOffset(),
    iso8601: now.toISOString()
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || REPO_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      shell: options.shell === true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
        return;
      }

      resolve({ stdout, stderr });
    });

    if (options.input) {
      child.stdin.write(options.input);
    }

    child.stdin.end();
  });
}

async function queryMcpServer() {
  if (!fileExists(MCP_SERVER_PATH)) {
    const error = new Error("MCP server entrypoint not found");
    error.code = "not_found";
    throw error;
  }

  const messages = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "current_time", arguments: {} } }
  ];

  const input = `${messages.map((message) => JSON.stringify(message)).join("\n")}\n`;
  const { stdout } = await runCommand(process.execPath, [MCP_SERVER_PATH], { input });
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const responseLine = lines.find((line) => {
    try {
      const parsed = JSON.parse(line);
      return parsed.id === 2;
    } catch (_error) {
      return false;
    }
  });

  if (!responseLine) {
    const error = new Error("No MCP tool response received");
    error.code = "invalid_output";
    throw error;
  }

  const response = JSON.parse(responseLine);
  const structured = response.result && response.result.structuredContent;

  if (!structured || !structured.timestamp) {
    const error = new Error("MCP tool response was missing structured time data");
    error.code = "invalid_output";
    throw error;
  }

  return {
    sourceKind: "mcp",
    time: structured
  };
}

async function queryHelper(commandPath, sourceKind) {
  if (!fileExists(commandPath)) {
    const error = new Error(`Time helper not found: ${commandPath}`);
    error.code = "not_found";
    throw error;
  }

  const helperCommand =
    process.platform === "win32"
      ? { command: "cmd.exe", args: ["/d", "/s", "/c", commandPath], shell: false }
      : { command: commandPath, args: [], shell: false };

  const { stdout } = await runCommand(helperCommand.command, helperCommand.args, {
    shell: helperCommand.shell
  });
  const parsed = parseDisplayString(stdout.trim());

  if (!parsed) {
    const error = new Error("Time helper output did not match the expected format");
    error.code = "invalid_output";
    throw error;
  }

  return {
    sourceKind,
    time: {
      ...parsed,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "local",
      offset: getCurrentOffset()
    }
  };
}

async function collectTimeContext(debugEnabled) {
  const disableMcp = process.env.CONTEXT_BRIDGE_DISABLE_MCP === "1";
  const disableHelper = process.env.CONTEXT_BRIDGE_DISABLE_HELPER === "1";
  const debug = createDebugLogger(debugEnabled);

  if (!disableMcp) {
    try {
      const result = await queryMcpServer();
      debug.log("selected time source: mcp");
      return result;
    } catch (mcpError) {
      debug.log(`skipped mcp: ${classifyError(mcpError)}`);
    }
  } else {
    debug.log("skipped mcp: disabled by env");
  }

  if (!disableHelper) {
    try {
      const result = await queryHelper(INSTALLED_HELPER_PATH, "helper");
      debug.log("selected time source: helper (installed)");
      return result;
    } catch (installedError) {
      debug.log(`skipped helper (installed): ${classifyError(installedError)}`);
      try {
        const result = await queryHelper(REPO_HELPER_PATH, "helper");
        debug.log("selected time source: helper (repo)");
        return result;
      } catch (repoError) {
        debug.log(`skipped helper (repo): ${classifyError(repoError)}`);
      }
    }
  } else {
    debug.log("skipped helper: disabled by env");
  }

  debug.log("selected time source: node");
  return {
    sourceKind: "node",
    time: buildNodeTimePayload()
  };
}

async function collectContext(options) {
  const debugEnabled = Boolean(options.debug || process.env.DEBUG_CONTEXT_BRIDGE === "1");
  const timeContext = await collectTimeContext(debugEnabled);

  return {
    source: SOURCE,
    version: VERSION,
    mode: options.mode,
    timeSource: timeContext.sourceKind,
    time: timeContext.time,
    platform: process.platform,
    hostname: os.hostname(),
    cwd: process.cwd()
  };
}

module.exports = {
  collectContext
};

function classifyError(error) {
  if (!error) {
    return "unknown";
  }

  if (error.code === "not_found") {
    return "not found";
  }

  if (error.code === "invalid_output") {
    return "invalid output";
  }

  if (error.code === "EPERM") {
    return "spawn blocked";
  }

  const message = String(error.message || "").toLowerCase();

  if (message.includes("eperm")) {
    return "spawn blocked";
  }

  if (message.includes("exited with code")) {
    return "non-zero exit";
  }

  if (message.includes("enoent")) {
    return "not found";
  }

  return "error";
}
