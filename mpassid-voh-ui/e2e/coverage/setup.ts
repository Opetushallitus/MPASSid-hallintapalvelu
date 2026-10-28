import { rmSync } from "node:fs";
import coverageOptions from "./options";

/** Poistaa edellisen ajon raportin ja välimuistin ennen workereiden käynnistystä. */
export default function globalSetup() {
  rmSync(coverageOptions.outputDir!, { recursive: true, force: true });
}
