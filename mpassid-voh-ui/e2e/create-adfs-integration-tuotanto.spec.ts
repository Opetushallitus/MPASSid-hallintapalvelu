import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  mockInstitutionTypes,
  selectEnvironment,
} from "./helpers";

// Tuotanto-versio create-adfs-integration.spec.ts:sta - identtinen muuten,
// paitsi Palveluympäristöksi valitaan "Tuotanto" ennen tallennusta. Ks.
// create-wilma-integration-tuotanto.spec.ts:n kommentti siitä, miksi
// koulunvalinta pysyy valinnaisena kun sibling-integraatiota ei ole.

test("luo uusi ADFS-integraatio Tuotanto-ympäristöön", async ({ page }) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "ADFS");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/adfs\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  await selectEnvironment(page, "Tuotanto");

  // metadataUrl: no format validation (IdentityProvider.tsx:120 validates
  // against an empty rule list), just needs to be non-empty.
  await page
    .getByPlaceholder("Lisää metadata url")
    .fill("https://adfs-tuotanto.esimerkki.fi/FederationMetadata/2007-06/FederationMetadata.xml");

  await fillCommonIdpSteps(page, "Mansikkalan ADFS-koulu (tuotanto)");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
