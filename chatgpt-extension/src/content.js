(function initContentScript() {
  const domApi = window.ChatGPTTimestampDOM;
  const injectApi = window.ChatGPTTimestampInject;
  const settingsApi = window.ChatGPTTimestampSettings;
  const contextClientApi = window.ChatGPTTimestampContextClient;
  let lastActiveComposer = null;
  let resumeSend = false;
  let pendingSend = false;

  if (!domApi || !injectApi || !settingsApi || !contextClientApi) {
    return;
  }

  function rememberComposer(candidate) {
    const composer = domApi.getComposerFromNode(candidate);

    if (!composer) {
      return;
    }

    lastActiveComposer = composer;
  }

  function continueSend(composer) {
    const button = domApi.getSubmitButtonFromComposer(composer);

    if (button) {
      resumeSend = true;
      button.click();
      return;
    }

    const form = composer instanceof Element ? composer.closest("form") : null;

    if (form instanceof HTMLFormElement) {
      resumeSend = true;
      form.requestSubmit();
      return;
    }
  }

  function waitForComposerCommit() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(resolve);
      });
    });
  }

  async function handlePath(path, composer) {
    try {
      const settings = await settingsApi.getSettings();
      const contextBlock = settings.autoInjectContext
        ? await contextClientApi.fetchContextBlock(settings.contextMode)
        : null;

      injectApi.prependContext(composer, {
        keepTimestamp: settings.keepTimestamp,
        contextBlock
      });
      await waitForComposerCommit();
    } catch (_error) {
      void path;
    } finally {
      pendingSend = false;
      continueSend(composer);
    }
  }

  document.addEventListener(
    "focusin",
    (event) => {
      rememberComposer(event.target);
    },
    true
  );

  document.addEventListener(
    "beforeinput",
    (event) => {
      rememberComposer(event.target);
    },
    true
  );

  document.addEventListener(
    "input",
    (event) => {
      rememberComposer(event.target);
    },
    true
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      const button = domApi.getSubmitButtonFromEventTarget(event.target);

      if (!button) {
        rememberComposer(event.target);
      }
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      if (resumeSend) {
        resumeSend = false;
        return;
      }

      const button = domApi.getSubmitButtonFromEventTarget(event.target);

      if (!button || pendingSend) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const cachedComposer = lastActiveComposer;
      const fallbackComposer = cachedComposer ? null : domApi.getComposerFromButton(button);
      const composer = cachedComposer || fallbackComposer;

      pendingSend = true;
      handlePath("click", composer);
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (resumeSend) {
        resumeSend = false;
        return;
      }

      if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
        return;
      }

      const composer = domApi.getComposerFromNode(event.target) || domApi.getActiveComposer();

      if (!composer || pendingSend) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      pendingSend = true;
      handlePath("enter", composer);
    },
    true
  );
})();
