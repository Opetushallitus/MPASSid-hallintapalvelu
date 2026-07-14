import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  fieldRow,
  fillCommonIdpSteps,
  fillWilmaFields,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
  selectEnvironment,
} from "./helpers";


test("olemassa olevan idp-integraation ympäristön vaihto Tuotanto -> Tuotanto-Testi", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "tuotannosta-tuotanto-testiin.inschool.fi");
  await fillCommonIdpSteps(page, "Ympäristönvaihtokoulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/(\d+)/);

  // Confirms the "always Tuotanto by default" premise above.
  await expect(page.getByText("Tuotanto", { exact: true })).toBeVisible();

  await openEditFromViewPage(page);
  await selectEnvironment(page, "Tuotanto-Testi");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await expect(page.getByText("Tuotanto-Testi", { exact: true })).toBeVisible();
  
});

test("'Testi' ei ole enää valittavissa kun idp-integraatio on jo Tuotannossa", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "ei-enaa-testiin.inschool.fi");
  await fillCommonIdpSteps(page, "Ei paluuta Testiin -koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/(\d+)/);

  await openEditFromViewPage(page);
  await fieldRow(page, "Palveluympäristö").getByRole("combobox").click();

  await expect(page.getByRole("option", { name: "Testi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Tuotanto-Testi", exact: true })).toBeVisible();
});
