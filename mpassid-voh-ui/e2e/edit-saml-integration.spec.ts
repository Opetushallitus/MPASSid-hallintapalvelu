import { expect, test } from "@playwright/test";
import {
  createNewSpIntegration,
  fillSamlMetadata,
  fillServiceName,
  logBrowserConsole,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";


test("muokkaa olemassa olevaa SAML-palveluintegraatiota", async ({ page }) => {
  logBrowserConsole(page);

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
