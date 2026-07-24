import { expect, test } from "@playwright/test";
import {
  createNewSpIntegration,
  fillServiceName,
  logBrowserConsole,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("luo uusi OIDC-palveluintegraatio", async ({ page }) => {
  logBrowserConsole(page);

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
  logBrowserConsole(page);

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
