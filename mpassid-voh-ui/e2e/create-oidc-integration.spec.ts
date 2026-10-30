import { expect, test } from "./fixtures";
import {
  createNewSpIntegration,
  fillServiceName,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// See create-wilma-integration.spec.ts, create-saml-integration.spec.ts and
// helpers.ts for general caveats. OIDC needs far less manual input than
// SAML: most of its mandatory metadata fields self-populate on mount and
// never require interaction (config.ts dataConfiguration, all
// integrationType 'oidc'):
//  - grant_types / response_types: multiselect with a `defaultValue`
//    ('authorization_code'/'code') - Metadata.tsx:280-284 auto-fills array
//    fields that have enum+defaultValue as soon as they mount.
//  - client_id / client_secret: `generate: 'randomsha1'`/'name_randomsha1'
//    - Form/index.tsx MetadataForm:330-338 SHA1-generates these on mount
//    and they are not editable, so there is nothing to fill.
//  - scope: fixed default 'openid profile', not editable, not mandatory.
// That leaves only `redirect_uris` (mandatory array, no default) needing a
// manual entry, plus the shared "Palvelun nimi" field from
// ServiceProvider.tsx.

test("luo uusi OIDC-palveluintegraatio", async ({ page }) => {
  await createNewSpIntegration(page, "OpenID Connect");

  await expect(page).toHaveURL(/\/muokkaa\/sp\/oidc\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();
  await expect(page.getByText("Palveluiden yhteiset tiedot")).toBeVisible();

  await page
    .getByPlaceholder("Lisää palvelun nimi", { exact: true })
    .fill("Mansikkalan testi OIDC-palvelu");

  await expect(page.getByText("Palvelun metadata tiedot")).toBeVisible();

  // redirect_uris: mandatory array (config.ts:606-638). Two validation
  // rows exist depending on deploymentPhase - the base rule ('uri',
  // 'nohash') always applies, the prod-environment row additionally
  // requires 'https' and disallows 'localhost'. Using a plain https URL
  // with no fragment satisfies both, regardless of which environment
  // "Testi - uusi" resolved to.
  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill("https://sp.esimerkki.fi/oidc/callback");
  await redirectUriInput.press("Enter");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });

  // client_secret (auto-generated, `generate: 'name_randomsha1'`) is shown
  // exactly once, right after the FIRST save (index.tsx:344-359) - only
  // while the value isn't yet masked with "***" by the backend.
  await expect(page.getByText("Muista tallentaa client_secret:")).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();
});

test("OIDC:n client_secret-muistutus ei toistu seuraavissa tallennuksissa", async ({
  page,
}) => {
  await createNewSpIntegration(page, "OpenID Connect");
  await fillServiceName(page, "Mansikkalan client_secret-testi");

  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill("https://sp.esimerkki.fi/oidc/callback");
  await redirectUriInput.press("Enter");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await page
    .getByPlaceholder("Lisää uusi redirect_uris")
    .fill("https://sp.esimerkki.fi/oidc/callback2");
  await page.getByPlaceholder("Lisää uusi redirect_uris").press("Enter");

  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();
  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByText("Muista tallentaa client_secret:")
  ).not.toBeVisible();
});
