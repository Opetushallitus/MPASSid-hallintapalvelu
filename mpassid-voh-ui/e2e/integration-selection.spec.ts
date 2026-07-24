import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  createNewSpIntegration,
  fillCommonIdpSteps,
  fillServiceName,
  fillWilmaFields,
  fillSamlMetadata,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

test("Integraatiovalinnat-välilehti näkyy vain idp-integraatioille", async ({
  page,
}) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "SAML");
  await fillServiceName(page, "Ei idp-valintoja -palvelu");
  await fillSamlMetadata(page);
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await expect(
    page.getByRole("tab", { name: "Integraatiotiedot" })
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Integraatiovalinnat" })
  ).not.toBeVisible();
});

test("Integraatiovalinnat: oletustila - kaikki sallittu, ei tallennettavaa", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "valinnat.inschool.fi");
  await fillCommonIdpSteps(page, "Valinnat-koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await page.getByRole("tab", { name: "Integraatiovalinnat" }).click();

  await expect(
    page.getByRole("checkbox", { name: "Salli kaikki palvelut" })
  ).toBeChecked();
  await expect(
    page.getByText(
      "Yksittäisten palvelujen tilaa ei voi muuttaa, kun kaikki palvelut ovat sallittuja"
    )
  ).toBeVisible();
  
  await expect(
    page.getByText(
      "Tallentaaksesi valinnat sinun pitää sallia vähintään yksi tai useampi palvelu"
    )
  ).not.toBeVisible();
  // The "Tallenna muutokset" snackbar (with its Tallenna/Peruuta buttons)
  // only exists in the DOM while saveDialogState is true - initially false
  // (eqCheck(integration,newIntegration) is trivially true on load).
  await expect(page.getByText("Tallenna muutokset")).not.toBeVisible();
});

test("Integraatiovalinnat: 'Salli kaikki palvelut' pois päältä vaatii valinnan tallentaakseen", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "eisallitse.inschool.fi");
  await fillCommonIdpSteps(page, "Ei-sallittu-koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await page.getByRole("tab", { name: "Integraatiovalinnat" }).click();
  await page.getByRole("checkbox", { name: "Salli kaikki palvelut" }).click();

  await expect(
    page.getByRole("checkbox", { name: "Salli kaikki palvelut" })
  ).not.toBeChecked();
  await expect(
    page.getByText(
      "Yksittäisten palvelujen tilaa ei voi muuttaa, kun kaikki palvelut ovat sallittuja"
    )
  ).not.toBeVisible();

  // Turning the switch off with zero candidates forces the snackbar open
  // (IntegrationSelection/index.tsx:110-121) even though nothing else
  // changed, specifically to surface the "must allow something" warning.
  await expect(page.getByText("Tallenna muutokset")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true })
  ).toBeDisabled();
});

test("Integraatiovalinnat: 'Poista valinnat' tekee tallennuksesta mahdollisen", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "poistavalinnat.inschool.fi");
  await fillCommonIdpSteps(page, "Poista-valinnat-koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await page.getByRole("tab", { name: "Integraatiovalinnat" }).click();

  // "Poista valinnat" (aria-label "poista") assigns permissions=[testService]
  // (length 1, a genuine non-empty array) without touching
  // activateAllServices - since activateAllServices is still true (default),
  // cannotSave() flips from false (permissions was undefined) to true
  // (activateAllServices=true), enabling Save.
  await page.getByLabel("poista", { exact: true }).click();

  await expect(page.getByText("Tallenna muutokset")).toBeVisible();
  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  await expect(saveButton).toBeEnabled();
  await saveButton.click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "OK" }).click();
});

test("Integraatiovalinnat: snackbarin 'Peruuta' palauttaa muuttamattoman tilan", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "peruutavalinnat.inschool.fi");
  await fillCommonIdpSteps(page, "Peruuta-valinnat-koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await page.getByRole("tab", { name: "Integraatiovalinnat" }).click();
  await page.getByRole("checkbox", { name: "Salli kaikki palvelut" }).click();
  await expect(page.getByText("Tallenna muutokset")).toBeVisible();

  await page.getByRole("button", { name: "Peruuta", exact: true }).click();

  await expect(page.getByText("Tallenna muutokset")).not.toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Salli kaikki palvelut" })
  ).toBeChecked();
});
