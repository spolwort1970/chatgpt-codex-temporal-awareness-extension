(function initContextClientModule() {
  const BASE_URL = "http://127.0.0.1:4317";
  const TIMEOUT_MS = 800;
  const MAX_BLOCK_LENGTH = 4096;

  function validateContextBlock(value) {
    const text = String(value || "").trim();

    if (!text.startsWith("[CTX]") || !text.endsWith("[/CTX]")) {
      return null;
    }

    if (text.length > MAX_BLOCK_LENGTH) {
      return null;
    }

    return text;
  }

  async function fetchContextBlock(mode) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(
        `${BASE_URL}/context?mode=${encodeURIComponent(mode === "extended" ? "extended" : "minimal")}`,
        {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        }
      );

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      return validateContextBlock(payload && payload.contextBlock);
    } catch (_error) {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  window.ChatGPTTimestampContextClient = {
    fetchContextBlock
  };
})();
