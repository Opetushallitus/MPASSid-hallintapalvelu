if (location.hostname === "localhost") {
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = ENV.RAAMIT_PATH.replace(".js", ".css");
  document.head.appendChild(link);
}

export {};
