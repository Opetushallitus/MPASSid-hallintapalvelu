import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillOpinsysFields,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// See edit-wilma-integration.spec.ts for the general create-then-edit
// rationale, and create-opinsys-integration.spec.ts for field provenance.

test("muokkaa olemassa olevaa Opinsys-integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);

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
