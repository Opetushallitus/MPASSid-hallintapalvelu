import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  mockInstitutionTypes,
} from "./helpers";

// See create-wilma-integration.spec.ts and helpers.ts for general caveats.
// ADFS has no clientId/clientKey/tenantId/user-attributes (config.ts's only
// per-type field for 'adfs' is `metadataUrl`, mandatory - config.ts:1113-
// 1137). Role/IdentityProvider.tsx:171-200 renders BOTH a metadataUrl text
// field AND a drag-and-drop file zone for adfs (joined by "tai"/"or") -
// this test uses the text field since it's a plain <input> (the file zone
// has no <input type=file>, see helpers.ts's dropTextFile doc comment; the
// create-gsuite-integration.spec.ts test exercises that path instead, since
// gsuite has no text-field alternative).

test("luo uusi ADFS-integraatio", async ({ page }) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "ADFS");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/adfs\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  // metadataUrl: no format validation (IdentityProvider.tsx:120 validates
  // against an empty rule list), just needs to be non-empty.
  await page
    .getByPlaceholder("Lisää metadata url")
    .fill("https://adfs.esimerkki.fi/FederationMetadata/2007-06/FederationMetadata.xml");

  await fillCommonIdpSteps(page, "Mansikkalan ADFS-koulu");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
