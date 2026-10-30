import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// Builds on create-wilma-integration.spec.ts's proven create flow (now
// factored into helpers.ts) and then edits the freshly-created integration.
// See helpers.ts's openEditFromViewPage doc comment for why a create-then-
// edit round trip within a single test is required for every "muokkaa"
// spec in this directory: there are no pre-existing per-id fixtures in this
// mock (schemas/response.json, the backing store for `allIntegrations` in
// src/mocks/requestLogicHandlers.ts, starts as an empty array). The edit
// button passes the integration as location.state; opening the edit URL
// without it is covered by edit-direct-url.spec.ts.

test("muokkaa olemassa olevaa Wilma-integraatiota", async ({ page }) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Wilma");
  await expect(page).toHaveURL(/\/muokkaa\/idp\/wilma\/0/);

  await fillWilmaFields(page, "koulu.inschool.fi");
  await fillCommonIdpSteps(page, "Mansikkalan koulu");
  await saveIntegration(page);

  // saveIntegration()'s "OK" click lands on /integraatio/<realId> -
  // integraationMuokkaus/index.tsx's closeNotice() navigates there with the
  // mock-assigned id (requestLogicHandlers.ts's createIntegration handler
  // assigns ids starting at 9000001).
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/idp\/wilma\/\d+/);

  // The existing value should already be pre-filled (InputForm.tsx defaults
  // its input from the passed-in object/path) - asserting this first
  // catches a broken edit-state handoff before building further assertions
  // on top of it.
  const hostnameInput = page.getByPlaceholder("Lisää hostname");
  await expect(hostnameInput).toHaveValue("koulu.inschool.fi");
  await hostnameInput.fill("toinenkoulu.inschool.fi");

  // Unlike creating a new idp integration, editing one that already has a
  // logoUrl set does NOT require re-selecting a logo file to enable
  // "Tallenna" (IntegrationDetails.tsx:301-304,379-382 - logoOK is already
  // true once `newConfigurationEntityData?.idp?.logoUrl` is non-empty).
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  // "Yksilöllinen tunniste" reads the saved idp.hostname (UniqueId.tsx), not
  // the hostname attribute: the edit form copies the attribute into it
  // (IntegrationDetails.tsx, config.ts "uniqueId": wilma -> hostname).
  await expect(
    page.getByText("Yksilöllinen tunniste", { exact: true }).locator("xpath=following-sibling::*[1]")
  ).toContainText("toinenkoulu.inschool.fi");
});
