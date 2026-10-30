import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  mockInstitutionTypes,
} from "./helpers";

// See create-wilma-integration.spec.ts and helpers.ts for the general
// caveats (unverified against a real browser, koodisto override rationale,
// etc). Opinsys-specific fields come from src/config.ts dataConfiguration:
// clientId/clientKey/tenantId are the only mandatory "data" fields for type
// 'opinsys' (config.ts:133-146,163-181,227-245) - unlike Wilma there is no
// `hostname` field, and unlike Azure there are no mandatory user attributes
// (opinsys is excluded from every user-attribute integrationType entry).

test("luo uusi Opinsys-integraatio", async ({ page }) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Opinsys");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/opinsys\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  // clientId: validation ['binddn'] (Validators.tsx validateDn) - needs at
  // least one DC=/dc= component; "dc=example,dc=fi" satisfies the regex.
  await page.getByPlaceholder("Lisää Client ID").fill("dc=example,dc=fi");
  // clientKey/tenantId: no format validation (config.ts:169,233).
  await page.getByPlaceholder("Lisää Client Key").fill("test-opinsys-client-key");
  await page.getByPlaceholder("Lisää Tenant ID").fill("test-opinsys-tenant-id");

  await fillCommonIdpSteps(page, "Mansikkalan Opinsys-koulu");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
