import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  deleteIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("poisto onnistuu ja ohjaa etusivulle", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  const hostname = "poistettava.inschool.fi";
  await fillWilmaFields(page, hostname);
  await fillCommonIdpSteps(page, "Poistettava koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await deleteIntegration(page);

  // closeNotice() (index.tsx:85-97) navigates to "/" when isDisabled.
  await expect(page).toHaveURL("/");

});

test("poiston peruutus vahvistusdialogista ei poista integraatiota", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  const hostname = "sailytettava.inschool.fi";
  await fillWilmaFields(page, hostname);
  await fillCommonIdpSteps(page, "Säilytettävä koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await page.getByLabel("poista", { exact: true }).click();
  await page.getByRole("button", { name: "Poista", exact: true }).click();

  await expect(
    page.getByText("Olet poistamassa integraation tietoja")
  ).toBeVisible();
  await expect(page.getByText("Haluatko varmasti poistaa?")).toBeVisible();

  await page.getByRole("button", { name: "PERUUTA", exact: true }).click();
  await expect(
    page.getByText("Olet poistamassa integraation tietoja")
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Poista", exact: true })
  ).toBeVisible();

  await page.getByLabel("poista", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true })
  ).toBeVisible();

  await page.getByPlaceholder("Lisää hostname").fill(`${hostname}-v2`);
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);
});
