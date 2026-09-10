import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  logBrowserConsole,
  mockInstitutionTypes,
  selectEnvironment,
} from "./helpers";

test("luo uusi Opinsys-integraatio Tuotanto-ympäristöön", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Opinsys");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/opinsys\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  await selectEnvironment(page, "Tuotanto");

  // clientId: validation ['binddn'] (Validators.tsx validateDn) - needs at
  // least one DC=/dc= component; "dc=example,dc=fi" satisfies the regex.
  await page.getByPlaceholder("Lisää Client ID").fill("dc=example,dc=fi");
  // clientKey/tenantId: no format validation (config.ts:169,233).
  await page
    .getByPlaceholder("Lisää Client Key")
    .fill("test-opinsys-client-key-tuotanto");
  await page
    .getByPlaceholder("Lisää Tenant ID")
    .fill("test-opinsys-tenant-id-tuotanto");

  await fillCommonIdpSteps(page, "Mansikkalan Opinsys-koulu (tuotanto)");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
