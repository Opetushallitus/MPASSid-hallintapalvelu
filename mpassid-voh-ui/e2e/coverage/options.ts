import type { CoverageReportOptions } from "monocart-coverage-reports";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// e2e-kattavuus (npm run test:e2e:coverage). Selaimen V8-kattavuus kerätään
// fixtures.ts:ssä jokaisesta testistä, ja globalTeardown (teardown.ts)
// yhdistää sen raportiksi. Dev-palvelin tarjoilee jokaisen src/-moduulin
// omana tiedostonaan sourcemapin kanssa, joten tulos kohdistuu suoraan
// alkuperäisiin .ts/.tsx-tiedostoihin.

/** Kattavuuden keruu vain tällä ympäristömuuttujalla; tavallinen ajo ei muutu. */
export const coverageEnabled = process.env.E2E_COVERAGE === "1";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

// Ei sovelluskoodia: MSW-mock, generoidut API-clientit (.gitignore),
// yksikkötestit ja niiden apukoodi, teeman esittelysivu.
const excluded = [
  /^src\/mocks\//,
  /^src\/test\//,
  /^src\/api\/(client|koodisto|käyttöoikeus|localisation|organisaatio)\.ts$/,
  /^src\/utils\/mui-theme\/Showcase\//,
  /\.test\.tsx?$/,
  /\.d\.ts$/,
];

const isAppSource = (sourcePath: string) =>
  /^src\/.+\.tsx?$/.test(sourcePath) && !excluded.some((re) => re.test(sourcePath));

/**
 * Poistaa dev-palvelimen osoitteen (localhost-3000/src/...), projektin
 * absoluuttisen polun ja Viten kyselyosan (?t=..., kirjastossa "-t=...").
 */
const normalizePath = (filePath: string) =>
  filePath
    .replace(/^localhost-\d+\//, "")
    .replace(projectRoot, "")
    .replace(projectRoot.replace(/^\//, ""), "")
    .replace(/(\.[cm]?[jt]sx?)-.*$/, "$1");

const coverageOptions: CoverageReportOptions = {
  name: "MPASSid-hallintapalvelu UI - e2e-kattavuus",
  outputDir: "./coverage-e2e",
  reports: ["v8", "console-summary", "lcovonly"],
  // Workerit kirjoittavat samaan välimuistiin; vain setup.ts tyhjentää sen.
  cleanCache: false,
  // Vain sovelluksen omat moduulit (ei /node_modules/.vite/deps/ -paketteja).
  entryFilter: (entry) => {
    const { pathname } = new URL(entry.url);
    return pathname.startsWith("/src/") && !pathname.startsWith("/src/mocks/");
  },
  // Yhtenäiset src/...-polut, jotta ladatut ja lataamattomat (all)
  // tiedostot yhdistyvät samaksi riviksi. Kutsutaan ensin ladatulle
  // tiedostolle ja sitten sen sourcemapin lähteille (info.distFile = jo
  // muunnettu ladattu tiedosto).
  sourcePath: (filePath, info) => {
    const sourcePath = normalizePath(filePath);
    if (sourcePath.startsWith("src/") || !info.distFile) {
      return sourcePath;
    }
    // Sourcemapin suhteellinen lähde ("App.tsx") ladatun tiedoston hakemistosta.
    return path.posix.join(path.posix.dirname(normalizePath(info.distFile)), sourcePath);
  },
  outputFilter: (file) => isAppSource(file.sourcePath),
  // Tiedostot, joita yksikään testi ei ladannut, mukaan 0 %:lla - muuten ne
  // puuttuisivat raportista ja kattavuus näyttäisi todellista paremmalta.
  all: {
    dir: ["./src"],
    // filePath on absoluuttinen.
    filter: (filePath) => isAppSource(path.relative(projectRoot, filePath)) && "js",
    transformer: async (entry) => {
      const { outputText, sourceMapText } = ts.transpileModule(entry.source, {
        fileName: fileURLToPath(entry.url),
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          sourceMap: true,
          inlineSources: true,
        },
      });
      entry.source = outputText;
      entry.sourceMap = JSON.parse(sourceMapText!);
    },
  },
};

export default coverageOptions;
