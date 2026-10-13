import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fillAzureFields,
  fillCommonIdpSteps,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// Covers EHDOTETUT_TESTIT.md's "9. Azure-attribuuttitesti" -
// AttributeTest.tsx, shown for type==='azure' once `canSave` is true, or
// always when editing an existing integration (id !== '0')
// (integraationMuokkaus/index.tsx:297). testAttributesAuthorization's
// mock handler (requestLogicHandlers.ts) always returns 200 for any input -
// there is no deterministic way to trigger the "Tilin authentikointi
// epäonnistui!" failure path without a mock-side hook, so it now recognizes
// a magic Client ID value (E2E_TRIGGER_ATTRIBUTE_TEST_FAILURE) the same way
// createIntegration/updateIntegration recognize the save-error triggers
// (see save-error.spec.ts) - mock-only test infrastructure, not a
// production change.

const E2E_TRIGGER_ATTRIBUTE_TEST_FAILURE = "__e2e_trigger_403__";

async function fillCompleteAzureIntegration(page: Page) {
  await createNewIdpIntegration(page, "Azure");
  await fillAzureFields(page);
  await fillCommonIdpSteps(page, "Attribuuttitestikoulu");
}

test("'Testaa attribuuttien oikeellisuus' -nappi vaatii täytetyt pakolliset kentät", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Azure");
  await expect(
    page.getByRole("button", { name: "Testaa attribuuttien oikeellisuus" })
  ).not.toBeVisible();

  await fillAzureFields(page);
  await fillCommonIdpSteps(page, "Attribuuttitestikoulu");

  const testButton = page.getByRole("button", {
    name: "Testaa attribuuttien oikeellisuus",
  });
  await expect(testButton).toBeVisible();
  await testButton.click();

  // readyToTest() (AttributeTest.tsx:107-126) requires principal, clientId
  // AND clientSecret to all be non-empty - TESTAA stays disabled with every
  // field still blank.
  await expect(
    page.getByRole("button", { name: "TESTAA", exact: true })
  ).toBeDisabled();
});

test("'Testaa attribuuttien oikeellisuus' -nappi näkyy olemassa olevaa integraatiota muokatessa, vaikka tallennus ei ole sallittu", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await fillCompleteAzureIntegration(page);
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await expect(page).toHaveURL(/\/muokkaa\/idp\/azure\/\d+/);

  // Emptying a mandatory field makes canSave false - for an existing
  // integration (id !== '0') the button must still be shown.
  await page.getByPlaceholder("Lisää Client ID", { exact: true }).fill("");
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Testaa attribuuttien oikeellisuus" })
  ).toBeVisible();
});

test("attribuuttitesti onnistuu ja näyttää attribuuttitaulukon", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await fillCompleteAzureIntegration(page);
  await page
    .getByRole("button", { name: "Testaa attribuuttien oikeellisuus" })
    .click();

  await page.getByPlaceholder("Client ID", { exact: true }).fill("client-id");
  await page.getByPlaceholder("Client Key", { exact: true }).fill("client-key");
  await page
    .getByPlaceholder("Tarkistettava käyttäjä", { exact: true })
    .fill("testuser@esimerkki.fi");

  const testaaButton = page.getByRole("button", { name: "TESTAA", exact: true });
  await expect(testaaButton).toBeEnabled();
  await testaaButton.click();

  await expect(page.getByText("Attribute name")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Attribute value")).toBeVisible();

  await page.getByRole("button", { name: "OK", exact: true }).click();
});

test("attribuuttitesti epäonnistuu tuntemattomalla tilillä", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await fillCompleteAzureIntegration(page);
  await page
    .getByRole("button", { name: "Testaa attribuuttien oikeellisuus" })
    .click();

  await page
    .getByPlaceholder("Client ID", { exact: true })
    .fill(E2E_TRIGGER_ATTRIBUTE_TEST_FAILURE);
  await page.getByPlaceholder("Client Key", { exact: true }).fill("client-key");
  await page
    .getByPlaceholder("Tarkistettava käyttäjä", { exact: true })
    .fill("testuser@esimerkki.fi");

  await page.getByRole("button", { name: "TESTAA", exact: true }).click();

  await expect(
    page.getByText("Tilin authentikointi epäonnistui!")
  ).toBeVisible({ timeout: 15_000 });
});
