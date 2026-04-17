(function initInjectModule() {
  const timeApi = window.ChatGPTTimestampTime;
  const TOP_SCAN_LIMIT = 1024;

  function normalizeLineBreaks(text) {
    return text.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  }

  function getContentEditableText(composer) {
    const rawText = composer.innerText || composer.textContent || "";
    return normalizeLineBreaks(rawText);
  }

  function getComposerText(composer) {
    if (composer instanceof HTMLTextAreaElement) {
      return normalizeLineBreaks(composer.value);
    }

    if (composer instanceof HTMLElement && composer.isContentEditable) {
      return getContentEditableText(composer);
    }

    return "";
  }

  function dispatchComposerInput(composer) {
    composer.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        composed: true,
        inputType: "insertText",
        data: null
      })
    );
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
    composer.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setTextareaValue(composer, value) {
    if (composer instanceof HTMLTextAreaElement) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");

      if (descriptor && typeof descriptor.set === "function") {
        descriptor.set.call(composer, value);
      } else {
        composer.value = value;
      }

      dispatchComposerInput(composer);
      return true;
    }

    return false;
  }

  function setContentEditableValue(composer, value) {
    if (!(composer instanceof HTMLElement) || !composer.isContentEditable) {
      return false;
    }

    composer.focus();

    const selection = window.getSelection();

    if (!selection) {
      return false;
    }

    const range = document.createRange();
    range.selectNodeContents(composer);
    selection.removeAllRanges();
    selection.addRange(range);

    let updated = false;

    try {
      if (document.queryCommandSupported && document.queryCommandSupported("insertText")) {
        updated = document.execCommand("insertText", false, value);
      }
    } catch (_error) {
      updated = false;
    }

    if (!updated) {
      composer.replaceChildren();

      const lines = value.split("\n");
      lines.forEach((line, index) => {
        if (index > 0) {
          composer.appendChild(document.createElement("br"));
        }

        composer.appendChild(document.createTextNode(line));
      });
    }

    selection.removeAllRanges();
    dispatchComposerInput(composer);
    return true;
  }

  function findTopSection(text) {
    return text.slice(0, TOP_SCAN_LIMIT);
  }

  function hasTimestampNearTop(text) {
    return /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [^\]]+\]/m.test(findTopSection(text));
  }

  function hasContextBlockNearTop(text) {
    const top = findTopSection(text);
    const start = top.indexOf("[CTX]");
    const end = top.indexOf("[/CTX]");
    return start !== -1 && end !== -1 && end > start;
  }

  function extractLeadingTimestamp(text) {
    const match = text.match(/^(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [^\]]+\])/);
    return match ? match[1] : "";
  }

  function normalizeExistingTopMatter(originalText, options = {}) {
    const keepTimestamp = options.keepTimestamp !== false;
    const contextBlock = typeof options.contextBlock === "string" ? options.contextBlock.trim() : "";
    const timestampLine = extractLeadingTimestamp(originalText);
    const ctxStart = originalText.indexOf("[CTX]");
    const ctxEnd = originalText.indexOf("[/CTX]");

    if (!timestampLine || !contextBlock || ctxStart === -1 || ctxEnd === -1 || ctxEnd <= ctxStart) {
      return originalText;
    }

    const bodyStart = ctxEnd + "[/CTX]".length;
    const bodyText = originalText.slice(bodyStart).replace(/^\s+/, "");
    const parts = [];

    if (keepTimestamp) {
      parts.push(timestampLine);
    }

    parts.push(contextBlock);

    if (bodyText) {
      parts.push(bodyText);
    }

    return parts.join("\n\n");
  }

  function buildPrependedText(originalText, options = {}) {
    const keepTimestamp = options.keepTimestamp !== false;
    const contextBlock = typeof options.contextBlock === "string" ? options.contextBlock.trim() : "";
    const parts = [];

    if (keepTimestamp && !hasTimestampNearTop(originalText)) {
      parts.push(timeApi.formatTimestamp());
    }

    if (contextBlock && !hasContextBlockNearTop(originalText)) {
      parts.push(contextBlock);
    }

    if (parts.length === 0) {
      return normalizeExistingTopMatter(originalText, options);
    }

    return `${parts.join("\n\n")}\n\n${originalText}`;
  }

  function prependContext(composer, options = {}) {
    if (!composer) {
      return {
        ok: false,
        reason: "composer-not-found"
      };
    }

    const originalText = getComposerText(composer);

    if (!originalText) {
      return {
        ok: false,
        reason: "empty-composer"
      };
    }

    const updatedText = buildPrependedText(originalText, options);

    if (updatedText === originalText) {
      return {
        ok: false,
        reason: "already-stamped"
      };
    }
    let ok = false;

    if (composer instanceof HTMLTextAreaElement) {
      ok = setTextareaValue(composer, updatedText);
    } else {
      ok = setContentEditableValue(composer, updatedText);
    }

    return {
      ok,
      reason: ok ? "stamped" : "mutation-failed"
    };
  }

  window.ChatGPTTimestampInject = {
    prependContext
  };
})();
