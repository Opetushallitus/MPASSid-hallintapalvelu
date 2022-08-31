import "@visma/public.config";

import definition from "@/api/schema.json";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App";

declare global {
  var ENV: {
    API_BASE_URL?: string;
    BASENAME?: string;
    GIT_AUTHOR_DATE: string;
    GIT_VERSION: string;
    MOCK?: string;
    PROD: boolean;
    RAAMIT_CSS_TEST_URL?: string;
    RAAMIT_PATH: string;
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
    <React.StrictMode>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

main();

const ErrorFallback = () => null;
