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

// Azure-attribuuttitesti -
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

// ---------------------------------------------------------------------------
// Edge cases of AttributeTest.tsx. Mock magic values (requestLogicHandlers.ts):
// clientId __e2e_trigger_unauthorized__ -> authorization answers 200 false,
// principal __e2e_unknown_principal__ -> testAttributes answers 404. The mock's
// testAttributes serves fixed nested data for the "deepTestAttributes" and
// "opentunti_desku" roots, read through each user attribute's content path.
// ---------------------------------------------------------------------------

const E2E_TRIGGER_ATTRIBUTE_TEST_UNAUTHORIZED = "__e2e_trigger_unauthorized__";
const E2E_UNKNOWN_PRINCIPAL = "__e2e_unknown_principal__";

/** The attribute test dialog (the edit form behind it has similar texts). */
const dialog = (page: Page) =>
  page.getByRole("dialog").filter({ hasText: "Tarkista attribuuttien oikeellisuus" });
const dialogButton = (page: Page) =>
  page.getByRole("button", { name: "Testaa attribuuttien oikeellisuus" });
const testaa = (page: Page) => page.getByRole("button", { name: "TESTAA", exact: true });
const clientIdInput = (page: Page) => page.getByPlaceholder("Client ID", { exact: true });
const clientKeyInput = (page: Page) => page.getByPlaceholder("Client Key", { exact: true });
const principalInput = (page: Page) =>
  page.getByPlaceholder("Tarkistettava käyttäjä", { exact: true });
const resultTable = (page: Page) => page.getByRole("table", { name: "attribute table" });
/** The value cell of the result table's row for the given attribute label. */
const resultValue = (page: Page, label: string) =>
  resultTable(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: label, exact: true }) })
    .getByRole("cell");

async function openAttributeTest(page: Page) {
  await mockInstitutionTypes(page);
  await fillCompleteAzureIntegration(page);
  await dialogButton(page).click();
}

async function fillCredentials(page: Page, principal = "testuser@esimerkki.fi", clientId = "client-id") {
  await clientIdInput(page).fill(clientId);
  await clientKeyInput(page).fill("client-key");
  await principalInput(page).fill(principal);
}

test.describe("attribuuttitestin reunatapaukset", () => {
  test("pakolliset kentät: tyhjennetty kenttä näyttää ohjeen ja estää testin", async ({ page }) => {
    await openAttributeTest(page);
    await fillCredentials(page);
    await expect(testaa(page)).toBeEnabled();

    await clientIdInput(page).fill("");
    await expect(dialog(page).getByText("Pakollinen kenttä")).toHaveCount(1);
    await expect(testaa(page)).toBeDisabled();
    await clientIdInput(page).fill("client-id");

    await principalInput(page).fill("");
    await expect(dialog(page).getByText("Pakollinen kenttä")).toHaveCount(1);
    await expect(testaa(page)).toBeDisabled();

    await principalInput(page).fill("testuser@esimerkki.fi");
    await expect(dialog(page).getByText("Pakollinen kenttä")).toHaveCount(0);
    await expect(testaa(page)).toBeEnabled();
  });

  test("Client Keyn näyttö ja piilotus", async ({ page }) => {
    await openAttributeTest(page);
    await clientKeyInput(page).fill("salainen-avain");

    await expect(clientKeyInput(page)).toHaveAttribute("type", "password");
    await dialog(page).getByRole("button", { name: "näytä" }).click();
    await expect(clientKeyInput(page)).toHaveAttribute("type", "text");
    await dialog(page).getByRole("button", { name: "näytä" }).click();
    await expect(clientKeyInput(page)).toHaveAttribute("type", "password");
  });

  test("valtuutus ei onnistu (200 false): virheilmoitus ja tunnukset kysytään yhä", async ({
    page,
  }) => {
    await openAttributeTest(page);
    await fillCredentials(page, "testuser@esimerkki.fi", E2E_TRIGGER_ATTRIBUTE_TEST_UNAUTHORIZED);
    await testaa(page).click();

    await expect(dialog(page).getByText("Tilin authentikointi epäonnistui!")).toBeVisible({
      timeout: 15_000,
    });
    await expect(clientIdInput(page)).toBeVisible();
    await expect(resultTable(page)).toHaveCount(0);
  });

  test("tuntematon käyttäjä: ohje, ja istunnossa seuraava testi kysyy vain käyttäjän", async ({
    page,
  }) => {
    await openAttributeTest(page);
    await fillCredentials(page, E2E_UNKNOWN_PRINCIPAL);
    await testaa(page).click();

    await expect(dialog(page).getByText("Tuntematon tilaaja")).toBeVisible({ timeout: 15_000 });
    await expect(resultTable(page)).toHaveCount(0);
    // The authorization succeeded: the session no longer asks for credentials.
    await expect(clientIdInput(page)).toHaveCount(0);
    await expect(clientKeyInput(page)).toHaveCount(0);

    // A changed principal clears the helper; the test runs in the session.
    await principalInput(page).fill("testuser@esimerkki.fi");
    await expect(dialog(page).getByText("Tuntematon tilaaja")).not.toBeVisible();
    await testaa(page).click();
    await expect(resultTable(page)).toBeVisible({ timeout: 15_000 });
  });

  test("sisäkkäiset polut näytetään tulostaulukossa, ja sulkeminen nollaa tuloksen", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createNewIdpIntegration(page, "Azure");
    await fillAzureFields(page);
    // Each user attribute's content is a path into the testAttributes response.
    await page.getByPlaceholder("Lisää Etunimi", { exact: true }).fill("deepTestAttributes.level2.level3");
    await page
      .getByPlaceholder("Lisää Sukunimi", { exact: true })
      .fill("deepTestAttributes.level2.level3Object.level4");
    await page
      .getByPlaceholder("Lisää Oppilaitostunnus", { exact: true })
      .fill("opentunti_desku.schoolNumber");
    // An intermediate object is shown as JSON.
    await page
      .getByPlaceholder("Lisää Oppijanumero", { exact: true })
      .fill("deepTestAttributes.level2.level3Object");
    // A path past a plain value resolves to nothing.
    await page
      .getByPlaceholder("Lisää Käyttäjän rooli", { exact: true })
      .fill("deepTestAttributes.level2.level3.puuttuu");
    await fillCommonIdpSteps(page, "Polkutestikoulu");

    await dialogButton(page).click();
    await fillCredentials(page);
    await testaa(page).click();
    await expect(resultTable(page)).toBeVisible({ timeout: 15_000 });

    await expect(resultValue(page, "Etunimi")).toHaveText("test_value_depth_3");
    await expect(resultValue(page, "Sukunimi")).toHaveText("test_value_depth_4");
    await expect(resultValue(page, "Oppilaitostunnus")).toHaveText("school number");
    await expect(resultValue(page, "Oppijanumero")).toHaveText('{"level4":"test_value_depth_4"}');
    await expect(resultValue(page, "Käyttäjän rooli")).toHaveText("");

    // OK closes the dialog and clears the result: reopened, it asks for a
    // principal again - but no credentials, the session is authorized.
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await dialogButton(page).click();
    await expect(resultTable(page)).toHaveCount(0);
    await expect(principalInput(page)).toBeVisible();
    await expect(clientIdInput(page)).toHaveCount(0);
    await expect(testaa(page)).toBeEnabled();
    await testaa(page).click();
    await expect(resultValue(page, "Etunimi")).toHaveText("test_value_depth_3", { timeout: 15_000 });
  });
});
