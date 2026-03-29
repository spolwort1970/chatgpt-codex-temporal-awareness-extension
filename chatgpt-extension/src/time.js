(function initTimeModule() {
  const PREFIX = "[";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function getTimeZoneName(date) {
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short"
    });
    const part = formatter.formatToParts(date).find((item) => item.type === "timeZoneName");
    return part ? part.value : "local";
  }

  function formatTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const zoneName = getTimeZoneName(date);

    return `${PREFIX}${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${zoneName}]`;
  }

  window.ChatGPTTimestampTime = {
    PREFIX,
    formatTimestamp
  };
})();
