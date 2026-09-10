import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  dropTextFile,
  fillCommonIdpSteps,
  logBrowserConsole,
  mockInstitutionTypes,
  selectEnvironment,
} from "./helpers";

test("luo uusi Google: Gsuite -integraatio Tuotanto-ympäristöön", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Google: Gsuite");

  await expect(page).toHaveURL(/\/muokkaa\/idp\/gsuite\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  await selectEnvironment(page, "Tuotanto");

  const dropZone = page.getByText("Drag & Drop metadata file");
  await expect(dropZone).toBeVisible({ timeout: 15_000 });
  await dropTextFile(
    page,
    dropZone,
    "metadata-tuotanto.xml",
    "text/xml",
    "<EntityDescriptor entityID=\"https://accounts.google.com/o/saml2\"></EntityDescriptor>"
  );

  await fillCommonIdpSteps(page, "Mansikkalan Gsuite-koulu (tuotanto)");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
