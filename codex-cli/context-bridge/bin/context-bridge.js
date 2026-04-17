#!/usr/bin/env node
"use strict";

const { collectContext } = require("../lib/collect");
const { normalizeContext } = require("../lib/normalize");
const { formatContextBlock } = require("../lib/format");
const { copyToClipboard } = require("../lib/clipboard");

function printUsage() {
  process.stdout.write(
    [
      "Usage: context-bridge [--minimal | --extended] [--copy] [--stdout] [--note <text>] [--debug]",
      "",
      "Options:",
      "  --minimal       Emit the default compact block.",
      "  --extended      Include cheap, stable extra fields.",
      "  --copy          Copy the emitted block to the clipboard as well as stdout.",
      "  --stdout        Explicit no-op; stdout is already the default.",
      "  --note <text>   Add a short note. Repeatable.",
      "  --debug         Emit time-source diagnostics to stderr.",
      "  --help          Show this help text."
    ].join("\n")
  );
}

function parseArgs(argv) {
  const options = {
    mode: "minimal",
    copy: false,
    stdout: true,
    notes: [],
    debug: process.env.DEBUG_CONTEXT_BRIDGE === "1"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--minimal":
        options.mode = "minimal";
        break;
      case "--extended":
        options.mode = "extended";
        break;
      case "--copy":
        options.copy = true;
        break;
      case "--stdout":
        options.stdout = true;
        break;
      case "--note": {
        const value = argv[index + 1];

        if (!value || value.startsWith("--")) {
          throw new Error("Missing value for --note");
        }

        options.notes.push(value);
        index += 1;
        break;
      }
      case "--debug":
        options.debug = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function main() {
  let options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n\n`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    printUsage();
    return;
  }

  const collected = await collectContext(options);
  const normalized = normalizeContext(collected, options);
  const block = formatContextBlock(normalized, options);

  if (options.stdout) {
    process.stdout.write(`${block}\n`);
  }

  if (options.copy) {
    try {
      await copyToClipboard(block);
    } catch (error) {
      process.stderr.write(`context-bridge warning: clipboard copy failed: ${error.message}\n`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`context-bridge error: ${error.message}\n`);
  process.exitCode = 1;
});
