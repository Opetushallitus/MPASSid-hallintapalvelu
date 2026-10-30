// Same as main.tsx: tsyringe (via @peculiar/x509, imported by src/config.ts)
// checks for the Reflect polyfill at load time.
import "reflect-metadata";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// @visma/public.config normally builds this global from the environment
// (see main.tsx). ERROR keeps the components' debug logging out of test output.
globalThis.ENV = {
  GIT_AUTHOR_DATE: "",
  GIT_VERSION: "test",
  LOCALES: ["fi-FI"],
  PROD: false,
  RAAMIT_PATH: "",
  LOG_LEVEL: "ERROR",
};

afterEach(() => {
  cleanup();
});
