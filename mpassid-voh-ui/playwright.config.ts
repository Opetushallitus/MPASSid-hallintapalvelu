import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Mitigates flakiness from parallel workers contending for the single
  // local dev server (e.g. a "Tallenna" enablement check occasionally
  // timing out under load, not a real app bug) - a retried test is still
  // flagged as flaky in the report, just not reported as a hard failure.
  retries: process.env.CI ? 2 : 1,
  // Per-test timeout (Playwright default is 30_000). The azure-attribute
  // tests build a full IdP integration before asserting, so under a cold
  // Vite dev server + parallel workers they occasionally exceed 30s and
  // time out at whichever step the clock happens to run out on. Note: this
  // is the top-level per-test timeout, distinct from webServer.timeout
  // below (dev-server startup) which is unrelated.
  timeout: 60_000,
  reporter: "html",
  // e2e-kattavuus (npm run test:e2e:coverage, ks. e2e/coverage/options.ts):
  // setup tyhjentää edellisen raportin, teardown yhdistää workereiden datan.
  ...(process.env.E2E_COVERAGE === "1"
    ? {
        globalSetup: "./e2e/coverage/setup.ts",
        globalTeardown: "./e2e/coverage/teardown.ts",
      }
    : {}),
  use: {
    // App runs unprefixed in dev (App.tsx only applies ENV.BASENAME when
    // ENV.PROD is true), and the dev server listens on :3000, not Vite's
    // default 5173 (set by @visma/vite-plugin-super-template's craLikePlugin).
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Slows down every Playwright action by this many ms - for visually
    // following a run, not for normal/CI use. Usage:
    //   SLOWMO=500 npm run test:e2e -- --headed
    // (--headed is what actually makes the browser visible; SLOWMO alone
    // just adds the delay in an otherwise-invisible headless run.)
    launchOptions: process.env.SLOWMO
      ? { slowMo: Number(process.env.SLOWMO) }
      : undefined,
  },
  webServer: {
    // .env.development already sets VITE_MOCK=msw, so `npm run dev` serves
    // the app wired up to the MSW mock backend with no extra flags needed.
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Runs the tests in a locally installed browser instead of
        // Playwright's bundled Chromium. Usage:
        //   PW_CHANNEL=chrome npm run test:e2e -- --headed
        // (also e.g. "msedge", "chrome-beta"). Unset = bundled Chromium.
        channel: process.env.PW_CHANNEL || undefined,
      },
    },
  ],
});
