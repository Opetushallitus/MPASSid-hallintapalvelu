import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillGsuiteFields,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("muokkaa olemassa olevaa Google: Gsuite -integraatiota", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Google: Gsuite");
  await expect(page).toHaveURL(/\/muokkaa\/idp\/gsuite\/0/);

  await fillGsuiteFields(page, "metadata.xml");
  await fillCommonIdpSteps(page, "Mansikkalan Gsuite-koulu");
  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/idp\/gsuite\/\d+/);

  await fillGsuiteFields(page, "metadata-v2.xml");

  await saveIntegration(page);
});
