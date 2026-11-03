import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillAdfsFields,
  fillCommonIdpSteps,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// See edit-wilma-integration.spec.ts for the general create-then-edit
// rationale, and create-adfs-integration.spec.ts for field provenance.

test("muokkaa olemassa olevaa ADFS-integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);

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
