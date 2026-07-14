import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("muokkaa olemassa olevaa Wilma-integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  await expect(page).toHaveURL(/\/muokkaa\/idp\/wilma\/0/);

  await fillWilmaFields(page, "koulu.inschool.fi");
  await fillCommonIdpSteps(page, "Mansikkalan koulu");
  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/idp\/wilma\/\d+/);


  const hostnameInput = page.getByPlaceholder("Lisää hostname");
  await expect(hostnameInput).toHaveValue("koulu.inschool.fi");
  await hostnameInput.fill("toinenkoulu.inschool.fi");

  await saveIntegration(page);
});
