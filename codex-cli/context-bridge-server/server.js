"use strict";

const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const HOST = "127.0.0.1";
const PORT = 4317;
const CLI_PATH = path.join(__dirname, "..", "context-bridge", "bin", "context-bridge.js");
const CLI_TIMEOUT_MS = 1200;

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  response.end(body);
}

function classifyError(error) {
  if (!error) {
    return "unknown";
  }

  if (error.code === "ETIMEDOUT") {
    return "timeout";
  }

  if (error.code === "ENOENT") {
    return "not_found";
  }

  const message = String(error.message || "").toLowerCase();

  if (message.includes("timed out")) {
    return "timeout";
  }

  if (message.includes("exited with code")) {
    return "non_zero_exit";
  }

  return "spawn_error";
}

function getModeFromUrl(requestUrl) {
  const parsed = new URL(requestUrl, `http://${HOST}:${PORT}`);
  const mode = parsed.searchParams.get("mode");
  return mode === "extended" ? "extended" : "minimal";
}

function validateContextBlock(text) {
  const trimmed = String(text || "").trim();

  if (!trimmed.startsWith("[CTX]") || !trimmed.endsWith("[/CTX]")) {
    return null;
  }

  if (trimmed.length > 4096) {
    return null;
  }

  return trimmed;
}

function runContextBridge(mode, debugEnabled) {
  return new Promise((resolve, reject) => {
    const args = [CLI_PATH];

    if (mode === "extended") {
      args.push("--extended");
    } else {
      args.push("--minimal");
    }

    if (debugEnabled) {
      args.push("--debug");
    }

    const child = spawn(process.execPath, args, {
      cwd: path.join(__dirname, "..", "context-bridge"),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let completed = false;
    const timer = setTimeout(() => {
      if (completed) {
        return;
      }

      const timeoutError = new Error("context-bridge timed out");
      timeoutError.code = "ETIMEDOUT";
      child.kill();
      reject(timeoutError);
    }, CLI_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (completed) {
        return;
      }

      completed = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (completed) {
        return;
      }

      completed = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(stderr.trim() || `context-bridge exited with code ${code}`));
        return;
      }

      const contextBlock = validateContextBlock(stdout);

      if (!contextBlock) {
        reject(new Error("context-bridge returned invalid output"));
        return;
      }

      resolve({
        contextBlock,
        debugOutput: stderr.trim()
      });
    });
  });
}

function shouldDebug(requestUrl) {
  const parsed = new URL(requestUrl, `http://${HOST}:${PORT}`);
  return parsed.searchParams.get("debug") === "1";
}

function handleContextRequest(request, response) {
  const mode = getModeFromUrl(request.url);
  const debugEnabled = shouldDebug(request.url);

  runContextBridge(mode, debugEnabled)
    .then(({ contextBlock, debugOutput }) => {
      const payload = {
        contextBlock
      };

      if (debugEnabled && debugOutput) {
        payload.debug = debugOutput.split(/\r?\n/).filter(Boolean);
      }

      sendJson(response, 200, payload);
    })
    .catch((error) => {
      sendJson(response, 503, {
        error: classifyError(error)
      });
    });
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      error: "method_not_allowed"
    });
    return;
  }

  const parsed = new URL(request.url, `http://${HOST}:${PORT}`);

  if (parsed.pathname === "/healthz") {
    sendJson(response, 200, {
      ok: true
    });
    return;
  }

  if (parsed.pathname === "/context") {
    handleContextRequest(request, response);
    return;
  }

  sendJson(response, 404, {
    error: "not_found"
  });
});

server.listen(PORT, HOST, () => {
  if (process.env.DEBUG_CONTEXT_BRIDGE === "1") {
    process.stderr.write(`[context-bridge-server] listening on http://${HOST}:${PORT}\n`);
  }
});
