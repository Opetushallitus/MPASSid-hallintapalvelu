import { expect, test } from "./fixtures";
import {
  createNewSpIntegration,
  fillSamlMetadata,
  fillServiceName,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// See edit-wilma-integration.spec.ts for the general create-then-edit
// rationale, and create-saml-integration.spec.ts for field provenance.
// fillSamlMetadata() only adds an assertionConsumerServiceUrls entry /
// signingCertificate when those lists are still empty (see its doc comment
// in helpers.ts), so calling it again on the edit page is safe - it will
// see the values already saved from creation and skip re-adding them,
// leaving only entityId's value actually changed.
//
// Palvelun nimi is also changed here (alongside entityId, not instead of
// it) to cover a regression where a name-only edit was silently dropped:
// IntegrationDetails.tsx tracks Palvelun nimi in its own `name` state,
// separate from `newConfigurationEntityData`, and only merged `name` into
// the saved sp object inside the branch that runs when
// newConfigurationEntityData itself changed - editing entityId already
// forces that branch to run, which is exactly why this test's entityId-only
// edit never surfaced the bug. Re-opening the edit page a second time below
// (a real GET round-trip, not just leftover client state) is what actually
// catches it - without it, the test would pass even if the name never left
// the browser.

test("muokkaa olemassa olevaa SAML-palveluintegraatiota", async ({ page }) => {
  await createNewSpIntegration(page, "SAML");
  await expect(page).toHaveURL(/\/muokkaa\/sp\/saml\/0/);

  await fillServiceName(page, "Mansikkalan testi SAML-palvelu");
  await fillSamlMetadata(page);
  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/sp\/saml\/\d+/);

  const entityIdInput = page.getByPlaceholder("Lisää Entity-ID");
  await expect(entityIdInput).toHaveValue(
    "https://sp.esimerkki.fi/saml/metadata"
  );
  await entityIdInput.fill("https://sp-v2.esimerkki.fi/saml/metadata");

  const serviceNameInput = page.getByPlaceholder("Lisää palvelun nimi", {
    exact: true,
  });
  await expect(serviceNameInput).toHaveValue("Mansikkalan testi SAML-palvelu");
  await serviceNameInput.fill("Mansikkalan testi SAML-palvelu v2");

  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/sp\/saml\/\d+/);

  await expect(page.getByPlaceholder("Lisää Entity-ID")).toHaveValue(
    "https://sp-v2.esimerkki.fi/saml/metadata"
  );
  await expect(
    page.getByPlaceholder("Lisää palvelun nimi", { exact: true })
  ).toHaveValue("Mansikkalan testi SAML-palvelu v2");
});

// Reported 2026-11-03: a saved SAML integration could not be edited at all -
// no change enabled "Tallenna". The first save copies the entityID into the
// hidden data attribute "entityId" (validation ['uri'] in config.ts), and a
// URN entityID - valid in SAML - failed it, so the form stayed invalid
// (Attributes.tsx validateAttributes now skips non-editable attributes'
// format).
test("SAML, jonka Entity-ID on URN, on muokattavissa tallennuksen jälkeen", async ({ page }) => {
  const urn = "urn:mace:esimerkki.fi:e2e-sp";
  await createNewSpIntegration(page, "SAML");
  await fillServiceName(page, "URN-palvelu");
  await fillSamlMetadata(page, urn);
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  // Opened again (as from the list): loaded by id.
  await page.reload();
  await openEditFromViewPage(page);
  await expect(page.getByPlaceholder("Lisää Entity-ID")).toHaveValue(urn);
  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  // Unchanged: nothing to save. (The create does not store the data
  // attribute entityId; opening the form adds it from sp.entityId, which is
  // not a change - IntegrationDetails compares against
  // withProviderFieldAttributes.)
  await expect(saveButton).toBeDisabled();

  await fillServiceName(page, "URN-palvelu v2");
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await expect(page.getByPlaceholder("Lisää palvelun nimi", { exact: true })).toHaveValue("URN-palvelu v2");
});
