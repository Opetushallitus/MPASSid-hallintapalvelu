import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillOpinsysFields,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("muokkaa olemassa olevaa Opinsys-integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Opinsys");
  await expect(page).toHaveURL(/\/muokkaa\/idp\/opinsys\/0/);

  await fillOpinsysFields(page);
  await fillCommonIdpSteps(page, "Mansikkalan Opinsys-koulu");
  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/idp\/opinsys\/\d+/);

  const clientKeyInput = page.getByPlaceholder("Lisää Client Key");
  await expect(clientKeyInput).toHaveValue("test-opinsys-client-key");
  await clientKeyInput.fill("test-opinsys-client-key-v2");

  await saveIntegration(page);
});
