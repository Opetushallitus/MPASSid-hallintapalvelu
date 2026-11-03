if (location.hostname === "localhost") {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = ENV.RAAMIT_PATH.replace(".js", ".css");
  document.head.appendChild(link);
}

export {};
