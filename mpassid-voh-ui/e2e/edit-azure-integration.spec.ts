import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillAzureFields,
  fillCommonIdpSteps,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("muokkaa olemassa olevaa Azure-integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Azure");
  await expect(page).toHaveURL(/\/muokkaa\/idp\/azure\/0/);

  await fillAzureFields(page);
  await fillCommonIdpSteps(page, "Mansikkalan Azure-koulu");
  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/idp\/azure\/\d+/);

  const clientIdInput = page.getByPlaceholder("Lisää Client ID");
  await expect(clientIdInput).toHaveValue("test-azure-client-id");
  await clientIdInput.fill("test-azure-client-id-v2");

  await saveIntegration(page);
});
