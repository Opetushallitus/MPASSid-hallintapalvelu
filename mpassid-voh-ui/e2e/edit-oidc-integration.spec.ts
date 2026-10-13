import { expect, test } from "./fixtures";
import {
  createNewSpIntegration,
  fillOidcMetadata,
  fillServiceName,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// See edit-wilma-integration.spec.ts for the general create-then-edit
// rationale, and create-oidc-integration.spec.ts for field provenance.
// Palvelun nimi is used as the edit target here (rather than redirect_uris)
// since it's a plain, single-valued text field - simplest to assert
// pre-fill/change against, unlike the array-based redirect_uris list.
//
// This edit is deliberately name-only (fillOidcMetadata isn't called again
// here, unlike edit-saml/edit-wilma) because that's exactly the case that
// used to silently fail to save: IntegrationDetails.tsx tracks Palvelun nimi
// in its own `name` state, separate from `newConfigurationEntityData`, and
// only merged `name` into the saved sp object inside the branch that runs
// when newConfigurationEntityData itself changed. A name-only edit left
// newConfigurationEntityData equal to the original, so that branch (and the
// setNewIntegration call inside it) never ran - the new name was accepted by
// the UI and "saved" without error, but never actually included in the
// request sent to the backend. Re-opening the edit page a second time here
// (a real GET round-trip, not just leftover client state) is what catches
// that regression - without it, the test would pass even if the name never
// left the browser.
test("muokkaa olemassa olevaa OIDC-palveluintegraatiota", async ({ page }) => {
  await createNewSpIntegration(page, "OpenID Connect");
  await expect(page).toHaveURL(/\/muokkaa\/sp\/oidc\/0/);

  await fillServiceName(page, "Mansikkalan testi OIDC-palvelu");
  await fillOidcMetadata(page);
  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/sp\/oidc\/\d+/);

  const serviceNameInput = page.getByPlaceholder("Lisää palvelun nimi", {
    exact: true,
  });
  await expect(serviceNameInput).toHaveValue("Mansikkalan testi OIDC-palvelu");
  await serviceNameInput.fill("Mansikkalan testi OIDC-palvelu v2");

  await saveIntegration(page);

  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/sp\/oidc\/\d+/);

  await expect(
    page.getByPlaceholder("Lisää palvelun nimi", { exact: true })
  ).toHaveValue("Mansikkalan testi OIDC-palvelu v2");
});
