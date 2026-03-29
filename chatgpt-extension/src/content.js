(function initContentScript() {
  const domApi = window.ChatGPTTimestampDOM;
  const injectApi = window.ChatGPTTimestampInject;
  let lastActiveComposer = null;

  if (!domApi || !injectApi) {
    return;
  }

  function rememberComposer(candidate) {
    const composer = domApi.getComposerFromNode(candidate);

    if (!composer) {
      return;
    }

    lastActiveComposer = composer;
  }

  function handlePath(path, composer) {
    try {
      injectApi.prependTimestamp(composer);
    } catch (_error) {
      console.debug(`[chatgpt-timestamp] ${path}: injection failed`);
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
      const button = domApi.getSubmitButtonFromEventTarget(event.target);

      if (!button) {
        return;
      }

      const cachedComposer = lastActiveComposer;
      const fallbackComposer = cachedComposer ? null : domApi.getComposerFromButton(button);
      const composer = cachedComposer || fallbackComposer;

      handlePath("click", composer);
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
        return;
      }

      const composer = domApi.getComposerFromNode(event.target) || domApi.getActiveComposer();

      if (!composer) {
        return;
      }

      handlePath("enter", composer);
    },
    true
  );
})();
