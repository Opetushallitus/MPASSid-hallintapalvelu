import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Mitigates flakiness from parallel workers contending for the single
  // local dev server (e.g. a "Tallenna" enablement check occasionally
  // timing out under load, not a real app bug) - a retried test is still
  // flagged as flaky in the report, just not reported as a hard failure.
  retries: process.env.CI ? 2 : 1,
  reporter: "html",
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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
