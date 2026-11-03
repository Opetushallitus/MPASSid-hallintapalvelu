import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillAzureFields,
  fillCommonIdpSteps,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// See edit-wilma-integration.spec.ts for the general create-then-edit
// rationale, and create-azure-integration.spec.ts for field provenance
// (this is the most involved idp type - mandatory clientId/clientKey/
// tenantId/azureApplicationIdUri/metadataUrl plus 5 mandatory user
// attributes). Only clientId is changed here to keep the edit assertion
// focused; the rest are re-filled identically via fillAzureFields() since
// they were never touched by the create flow's own gating logic (the
// existing values are pre-filled from location.state either way).

test("muokkaa olemassa olevaa Azure-integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);

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
