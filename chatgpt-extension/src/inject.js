(function initInjectModule() {
  const timeApi = window.ChatGPTTimestampTime;

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

  function alreadyTimestamped(text) {
    return text.startsWith(timeApi.PREFIX);
  }

  function prependTimestamp(composer) {
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

    if (alreadyTimestamped(originalText)) {
      return {
        ok: false,
        reason: "already-stamped"
      };
    }

    const updatedText = `${timeApi.formatTimestamp()}\n\n${originalText}`;
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
    prependTimestamp
  };
})();
