if (location.hostname !== "localhost") {
  const script = document.createElement("script");
  script.src = "/virkailija-raamit/apply-raamit.js";
  document.head.appendChild(script);
} else {
  const div = document.createElement("div");
  div.id = "raamit_app_root";
  div.innerHTML =
    '<header class="virkailija-raamit virkailija-raamit-test" style="color:grey;line-height:45px;text-align:center;">(raamit-placeholder)</header>';
  document.body.prepend(div);

  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://virkailija.testiopintopolku.fi/virkailija-raamit/apply-raamit.css";
  document.head.appendChild(link);
}

export {};
