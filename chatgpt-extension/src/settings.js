(function initSettingsModule() {
  const STORAGE_KEY = "chatgptTimestampSettings";
  const DEFAULTS = {
    autoInjectContext: true,
    keepTimestamp: true,
    contextMode: "minimal"
  };

  function getStorageArea() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      return chrome.storage.sync;
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return chrome.storage.local;
    }

    return null;
  }

  function normalizeSettings(settings) {
    const merged = Object.assign({}, DEFAULTS, settings || {});

    return {
      autoInjectContext: merged.autoInjectContext !== false,
      keepTimestamp: merged.keepTimestamp !== false,
      contextMode: merged.contextMode === "extended" ? "extended" : "minimal"
    };
  }

  async function getSettings() {
    const storage = getStorageArea();

    if (!storage) {
      return normalizeSettings();
    }

    return new Promise((resolve) => {
      storage.get([STORAGE_KEY], (result) => {
        resolve(normalizeSettings(result && result[STORAGE_KEY]));
      });
    });
  }

  async function setSettings(nextSettings) {
    const storage = getStorageArea();
    const normalized = normalizeSettings(nextSettings);

    if (!storage) {
      return normalized;
    }

    return new Promise((resolve) => {
      storage.set({ [STORAGE_KEY]: normalized }, () => resolve(normalized));
    });
  }

  window.ChatGPTTimestampSettings = {
    DEFAULTS,
    getSettings,
    setSettings
  };
})();
