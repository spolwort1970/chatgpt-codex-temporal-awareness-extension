(function initOptionsPage() {
  const settingsApi = window.ChatGPTTimestampSettings;

  if (!settingsApi) {
    return;
  }

  async function hydrateForm() {
    const settings = await settingsApi.getSettings();
    const autoInject = document.getElementById("autoInjectContext");
    const keepTimestamp = document.getElementById("keepTimestamp");
    const contextMode = document.getElementById("contextMode");

    if (!autoInject || !keepTimestamp || !contextMode) {
      return;
    }

    autoInject.checked = settings.autoInjectContext;
    keepTimestamp.checked = settings.keepTimestamp;
    contextMode.value = settings.contextMode;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const autoInject = document.getElementById("autoInjectContext");
    const keepTimestamp = document.getElementById("keepTimestamp");
    const contextMode = document.getElementById("contextMode");
    const status = document.getElementById("status");

    const nextSettings = {
      autoInjectContext: Boolean(autoInject && autoInject.checked),
      keepTimestamp: Boolean(keepTimestamp && keepTimestamp.checked),
      contextMode: contextMode && contextMode.value === "extended" ? "extended" : "minimal"
    };

    await settingsApi.setSettings(nextSettings);

    if (status) {
      status.textContent = "Saved.";
      window.setTimeout(() => {
        status.textContent = "";
      }, 1200);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    hydrateForm();

    const form = document.getElementById("settingsForm");

    if (form) {
      form.addEventListener("submit", handleSubmit);
    }
  });
})();
