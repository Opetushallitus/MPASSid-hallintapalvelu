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
