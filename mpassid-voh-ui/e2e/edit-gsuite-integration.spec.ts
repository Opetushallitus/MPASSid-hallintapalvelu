import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  fillGsuiteFields,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// See edit-wilma-integration.spec.ts for the general create-then-edit
// rationale, and create-gsuite-integration.spec.ts for field provenance
// (drag-and-drop-only metadata upload, no text-field alternative). Unlike
// the other edit specs, there is no `<input>`/value to assert against
// before re-uploading - a dropped `File` is never reflected back as a
// persisted, re-readable value client-side (only the resulting
// `metadataUrl` string is - see fillGsuiteFields' doc comment in
// helpers.ts) - so this test just re-drops a differently-named file and
// confirms the save still succeeds.

test("muokkaa olemassa olevaa Google: Gsuite -integraatiota", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  // Diagnosing a "Tallenna" stays disabled failure on the second save below:
  // IntegrationDetails.tsx's debugLog(...) calls trace canSaveConfiguration-
  // Entity/canSaveDiscoveryInformation/isValid/logoOK on every recompute.
  // The fixtures.ts auto fixture captures them into the run's browser-console
  // attachment - run with E2E_LOG_LEVEL=DEBUG to see them.

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
