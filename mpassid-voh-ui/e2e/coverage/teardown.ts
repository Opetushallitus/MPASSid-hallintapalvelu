import { MCR } from "monocart-coverage-reports";
import coverageOptions from "./options";

/** Yhdistää workereiden keräämän kattavuuden yhdeksi raportiksi. */
export default async function globalTeardown() {
  const results = await MCR(coverageOptions).generate();
  if (!results || results.files.length === 0) {
    throw new Error(
      "e2e-kattavuutta ei syntynyt: tarkista fixtures.ts:n keruu ja options.ts:n suodattimet"
    );
  }
}
