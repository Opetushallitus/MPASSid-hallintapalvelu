if (location.hostname !== "localhost") {
  const script = document.createElement("script");
  script.src = ENV.RAAMIT_PATH;
  document.head.appendChild(script);
} else {
  const div = document.createElement("div");
  div.id = "raamit_app_root";
  div.innerHTML =
    '<header class="virkailija-raamit virkailija-raamit-test" style="color:grey;line-height:45px;text-align:center;">(raamit-placeholder)</header>';
  document.body.prepend(div);

  if (ENV.RAAMIT_CSS_TEST_URL) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = ENV.RAAMIT_CSS_TEST_URL;
    document.head.appendChild(link);
  }
}

export {};
