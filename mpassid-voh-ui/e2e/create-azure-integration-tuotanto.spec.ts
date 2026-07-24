import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillCommonIdpSteps,
  logBrowserConsole,
  mockInstitutionTypes,
  selectEnvironment,
} from "./helpers";

test("luo uusi Azure-integraatio Tuotanto-ympäristöön", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Azure");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/azure\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  await selectEnvironment(page, "Tuotanto");

  // data fields (config.ts: clientId/clientKey validation:[], tenantId
  // validation:[], azureApplicationIdUri validation:[] - no format checks).
  // exact:true matters here: azure (uniquely among idp types) also renders
  // a `clientKeyValidUntil` field whose placeholder ("Lisää Client Keyn
  // voimassaolo") contains "Lisää Client Key" as a prefix.
  await page
    .getByPlaceholder("Lisää Client ID", { exact: true })
    .fill("test-azure-client-id-tuotanto");
  await page
    .getByPlaceholder("Lisää Client Key", { exact: true })
    .fill("test-azure-client-key-tuotanto");
  await page
    .getByPlaceholder("Lisää Tenant ID", { exact: true })
    .fill("test-azure-tenant-id-tuotanto");
  await page
    .getByPlaceholder("Lisää azureApplicationIdUri", { exact: true })
    .fill("api://mpassid-e2e-test-tuotanto");
  await page
    .getByPlaceholder("Lisää metadata url", { exact: true })
    .fill(
      "https://login.microsoftonline.com/test-azure-tenant-id-tuotanto/federationmetadata/2007-06/federationmetadata.xml"
    );

  // Mandatory user attributes (config.ts, all `type: 'user'`, mandatory for
  // 'azure'): any non-empty string satisfies validation (no `validation`
  // rules set).
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

  await fillCommonIdpSteps(page, "Mansikkalan Azure-koulu (tuotanto)");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
