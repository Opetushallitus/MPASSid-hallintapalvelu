import { test as base } from "@playwright/test";
import { appendFileSync } from "node:fs";
import coverageOptions, { coverageEnabled } from "./coverage/options";

export { expect } from "@playwright/test";

/**
 * Sovelluksen lokitaso tälle ajolle. `devLog.ts` ratkaisee tason kerran
 * moduulin latautuessa, ja localStorage-override voittaa buildin
 * VITE_LOG_LEVELin - joten taso on asetettava ENNEN sivun skriptejä.
 * `page.addInitScript` tekee juuri sen.
 *
 *   npm run test:e2e                        -> INFO (vain WARN + ERROR)
 *   E2E_LOG_LEVEL=DEBUG npm run test:e2e    -> DEBUG (kaikki)
 *
 * Huom: ilman tätä e2e ajaisi DEBUG-tasolla, koska .env.development asettaa
 * VITE_LOG_LEVEL=DEBUG. Oletus INFO pitää normaalin ajon hiljaisena.
 */
const logLevel = process.env.E2E_LOG_LEVEL ?? "INFO";

/** Kaiuta selaimen konsoli myös testin stdoutiin: E2E_LOG_STDOUT=1 */
const echoToStdout = process.env.E2E_LOG_STDOUT === "1";

export const test = base.extend<{ browserLog: void; coverage: void }>({
  /**
   * Automaattinen fixture: ei tarvitse kutsua spekeistä. Asettaa lokitason ja
   * kirjoittaa selaimen konsolin testikohtaiseen tiedostoon.
   *
   * Testikohtainen tiedosto EIKÄ yksi yhteinen, koska playwright.config.ts:ssä
   * on fullyParallel: true - useampi worker kirjoittaisi samaan tiedostoon ja
   * rivit menisivät sekaisin. testInfo.outputPath() antaa uniikin polun
   * test-results/-hakemistoon, ja attach() liittää sen HTML-raporttiin, josta
   * epäonnistuneen testin lokin näkee suoraan.
   */
  browserLog: [
    async ({ page }, use, testInfo) => {
      await page.addInitScript((level: string) => {
        try {
          window.localStorage.setItem("hallintapalvelu-log-level", level);
        } catch {
          // Selain voi estää localStorage-pääsyn; testi jatkaa oletustasolla.
        }
      }, logLevel);

      const file = testInfo.outputPath("browser-console.log");
      const write = (line: string) => {
        appendFileSync(file, line + "\n");
        if (echoToStdout) {
          // eslint-disable-next-line no-console
          console.log(line);
        }
      };

      write(`--- ${testInfo.titlePath.join(" > ")} (log level: ${logLevel}) ---`);
      page.on("console", (msg) => write(`[browser:${msg.type()}] ${msg.text()}`));
      page.on("pageerror", (err) =>
        write(`[browser:pageerror] ${err.message}\n${err.stack ?? ""}`)
      );

      await use();

      await testInfo.attach("browser-console", {
        path: file,
        contentType: "text/plain",
      });
    },
    { auto: true },
  ],

  /**
   * Selaimen JS-kattavuus (vain E2E_COVERAGE=1, ks. coverage/options.ts).
   * Kirjasto ladataan vasta tarvittaessa, joten tavallinen ajo ei riipu
   * siitä.
   *
   * Täysi sivunlataus (page.goto()/reload()) hävittää edellisen dokumentin
   * skriptit ja niiden kattavuuden - resetOnNavigation: false ei sitä estä.
   * Siksi kertynyt kattavuus kerätään talteen ennen jokaista testin omaa
   * goto()/reload()-kutsua. (Sovellus itse navigoi vain SPA-reitityksellä.)
   */
  coverage: [
    async ({ page, browserName }, use) => {
      if (!coverageEnabled || browserName !== "chromium") {
        await use();
        return;
      }
      const { MCR } = await import("monocart-coverage-reports");
      const mcr = MCR(coverageOptions);
      const start = () => page.coverage.startJSCoverage({ resetOnNavigation: false });
      const collect = async () => {
        const entries = await page.coverage.stopJSCoverage();
        if (entries.length > 0) {
          await mcr.add(entries);
        }
      };

      const goto = page.goto.bind(page);
      const reload = page.reload.bind(page);
      page.goto = async (...args) => {
        await collect();
        await start();
        return goto(...args);
      };
      page.reload = async (...args) => {
        await collect();
        await start();
        return reload(...args);
      };

      await start();
      // Playwright ajaa use():n jälkeisen osan myös epäonnistuneelle testille.
      await use();
      await collect();
    },
    { auto: true },
  ],
});
