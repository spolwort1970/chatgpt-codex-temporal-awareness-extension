"use strict";

const { spawn } = require("child_process");

function runClipboardCommand(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "ignore", "pipe"],
      windowsHide: true
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
        return;
      }

      resolve();
    });

    child.stdin.end(input);
  });
}

async function copyToClipboard(text) {
  if (process.platform === "win32") {
    await runClipboardCommand("powershell", ["-NoProfile", "-Command", "Set-Clipboard"], text);
    return;
  }

  if (process.platform === "darwin") {
    await runClipboardCommand("pbcopy", [], text);
    return;
  }

  await runClipboardCommand("xclip", ["-selection", "clipboard"], text);
}

module.exports = {
  copyToClipboard
};
