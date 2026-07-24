import { expect, test } from "@playwright/test";
import {
  createNewSpIntegration,
  fillOidcMetadata,
  fillServiceName,
  logBrowserConsole,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("muokkaa olemassa olevaa OIDC-palveluintegraatiota", async ({ page }) => {
  logBrowserConsole(page);

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
