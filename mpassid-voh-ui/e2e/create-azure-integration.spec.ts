import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  logBrowserConsole,
  mockInstitutionTypes,
} from "./helpers";

test("luo uusi Azure-integraatio", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Azure");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/azure\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  // data fields (config.ts: clientId/clientKey validation:[], tenantId
  // validation:[], azureApplicationIdUri validation:[] - no format checks).
  // exact:true matters here: Playwright's getByPlaceholder does a
  // case-insensitive *substring* match by default, and azure (uniquely
  // among idp types) also renders a `clientKeyValidUntil` field whose
  // placeholder ("Lisää Client Keyn voimassaolo") contains "Lisää Client
  // Key" as a prefix - without exact:true, .fill() on "Lisää Client Key"
  // hits both inputs and throws a strict-mode violation.
  await page
    .getByPlaceholder("Lisää Client ID", { exact: true })
    .fill("test-azure-client-id");
  await page
    .getByPlaceholder("Lisää Client Key", { exact: true })
    .fill("test-azure-client-key");
  await page
    .getByPlaceholder("Lisää Tenant ID", { exact: true })
    .fill("test-azure-tenant-id");
  await page
    .getByPlaceholder("Lisää azureApplicationIdUri", { exact: true })
    .fill("api://mpassid-e2e-test");
  await page
    .getByPlaceholder("Lisää metadata url", { exact: true })
    .fill(
      "https://login.microsoftonline.com/test-azure-tenant-id/federationmetadata/2007-06/federationmetadata.xml"
    );

  // Mandatory user attributes (config.ts, all `type: 'user'`, mandatory for
  // 'azure'): these map an Azure AD claim name to the MPASSid attribute,
  // any non-empty string satisfies validation (no `validation` rules set).
  await page.getByPlaceholder("Lisää Etunimi", { exact: true }).fill("given_name");
  await page.getByPlaceholder("Lisää Sukunimi", { exact: true }).fill("family_name");
  await page
    .getByPlaceholder("Lisää Oppilaitostunnus", { exact: true })
    .fill("school_id");
  await page
    .getByPlaceholder("Lisää Oppijanumero", { exact: true })
    .fill("learner_id");
  await page
    .getByPlaceholder("Lisää Käyttäjän rooli", { exact: true })
    .fill("role");

  await fillCommonIdpSteps(page, "Mansikkalan Azure-koulu");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
