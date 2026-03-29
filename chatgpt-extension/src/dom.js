(function initDomModule() {
  const EDITOR_SELECTOR = [
    "textarea",
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"][data-lexical-editor="true"]',
    '[contenteditable="true"][translate="no"]'
  ].join(", ");

  const SUBMIT_BUTTON_SELECTOR = [
    'button[type="submit"]',
    'button[aria-label*="Send"]',
    'button[data-testid*="send"]'
  ].join(", ");

  function isEditable(element) {
    return Boolean(
      element &&
      (
        element instanceof HTMLTextAreaElement ||
        (element instanceof HTMLElement && element.isContentEditable)
      )
    );
  }

  function getComposerFromNode(node) {
    if (isEditable(node)) {
      return node;
    }

    if (!(node instanceof Element)) {
      return null;
    }

    return node.closest(EDITOR_SELECTOR) || node.querySelector(EDITOR_SELECTOR);
  }

  function getComposerFromButton(button) {
    if (!(button instanceof HTMLElement)) {
      return null;
    }

    const form = button.form || button.closest("form");
    const formComposer = form instanceof HTMLFormElement ? form.querySelector(EDITOR_SELECTOR) : null;

    if (formComposer) {
      return formComposer;
    }

    const region = button.closest("main, article, section, div");

    if (!(region instanceof Element)) {
      return null;
    }

    return region.querySelector(EDITOR_SELECTOR);
  }

  function getActiveComposer() {
    const active = document.activeElement;
    const directMatch = getComposerFromNode(active);

    if (directMatch) {
      return directMatch;
    }

    return document.querySelector(EDITOR_SELECTOR);
  }

  function getSubmitButtonFromEventTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const button = target.closest(SUBMIT_BUTTON_SELECTOR);

    if (!(button instanceof HTMLButtonElement)) {
      return null;
    }

    if (button.disabled || button.getAttribute("aria-disabled") === "true") {
      return null;
    }

    return button;
  }

  window.ChatGPTTimestampDOM = {
    getActiveComposer,
    getComposerFromNode,
    getComposerFromButton,
    getSubmitButtonFromEventTarget
  };
})();
