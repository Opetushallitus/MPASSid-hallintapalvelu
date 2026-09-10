import { expect, test, type Page } from "@playwright/test";
import {
  createNewIdpIntegration,
  fillAzureFields,
  fillCommonIdpSteps,
  logBrowserConsole,
  mockInstitutionTypes,
} from "./helpers";

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
  logBrowserConsole(page);

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

test("attribuuttitesti onnistuu ja näyttää attribuuttitaulukon", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

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
  logBrowserConsole(page);

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
