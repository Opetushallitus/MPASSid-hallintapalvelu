import "@visma/public.config";

import "./patchLocalhostApplyRaamit";

import App from "@/App";
import VirkailijaRaamit from "@opetushallitus/virkailija-ui-components/VirkailijaRaamit";
import React from "react";
import ReactDOM from "react-dom/client";
import definition from "../schemas/schema.json";

declare global {
  var ENV: {
    API_BASE_URL?: string;
    BASENAME?: string;
    GIT_AUTHOR_DATE: string;
    GIT_VERSION: string;
    LOCALES: string[];
    MOCK?: string;
    PROD: boolean;
    RAAMIT_PATH: string;
    SUPPORT_URI?: string;
  };
}

if (ENV.API_BASE_URL) {
  const isAbsoluteURL =
    ENV.API_BASE_URL.indexOf("://") > 0 || ENV.API_BASE_URL.indexOf("//") === 0;

  definition.servers![0]!.url = isAbsoluteURL
    ? ENV.API_BASE_URL
    : window.location.origin + ENV.API_BASE_URL;
}

async function main() {
  if (ENV.MOCK === "msw") {
    const { worker } = await import("./mocks/browser.js");

    await worker.start({
      onUnhandledRequest: "bypass",
    });
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <>
      <VirkailijaRaamit scriptUrl={ENV.RAAMIT_PATH} />
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </>
  );
}

main();
