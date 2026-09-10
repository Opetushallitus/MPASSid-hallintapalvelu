import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillAdfsFields,
  fillCommonIdpSteps,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("muokkaa olemassa olevaa ADFS-integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "ADFS");
  await expect(page).toHaveURL(/\/muokkaa\/idp\/adfs\/0/);

  await fillAdfsFields(page);
  await fillCommonIdpSteps(page, "Mansikkalan ADFS-koulu");
  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/idp\/adfs\/\d+/);

  const metadataUrlInput = page.getByPlaceholder("Lisää metadata url");
  await expect(metadataUrlInput).toHaveValue(
    "https://adfs.esimerkki.fi/FederationMetadata/2007-06/FederationMetadata.xml"
  );
  await metadataUrlInput.fill(
    "https://adfs-v2.esimerkki.fi/FederationMetadata/2007-06/FederationMetadata.xml"
  );

  await saveIntegration(page);
});
