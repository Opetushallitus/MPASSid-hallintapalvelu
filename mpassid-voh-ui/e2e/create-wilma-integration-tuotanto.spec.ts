import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  logBrowserConsole,
  mockInstitutionTypes,
  selectEnvironment,
} from "./helpers";

test("luo uusi Wilma-integraatio Tuotanto-ympäristöön", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/wilma\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  await selectEnvironment(page, "Tuotanto");

  await fillWilmaFields(page, "koulu-tuotanto.inschool.fi");

  await fillCommonIdpSteps(page, "Mansikkalan koulu (tuotanto)");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
