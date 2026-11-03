import { type Locator, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  createNewSpIntegration,
  fieldRow,
  fillServiceName,
  openEditFromViewPage,
  saveIntegration,
  TEST_SIGNING_CERT,
} from "./helpers";

// Lista- ja objektilomakkeiden reunatapaukset (e2e-kattavuuden aukot):
// - ObjectForm.tsx: SAML assertionConsumerServiceUrls (objektilista,
//   config.ts: bindings/index/isDefault/location). Rivin muokkaus ja poisto,
//   isDefault-kytkin, automaattinen index (roleConfiguration.index==='auto')
//   ja virheellisen rivin hylkäys (validateObject).
// - ListForm.tsx: OIDC redirect_uris (merkkijonolista). Erillinen
//   "Lisää"-nappi (pressEnter-kahva), näppäilyn aikainen validointi
//   (onKeyUp -> validateFormValue; fill() ei laukaise sitä), tyhjä Enter ja
//   rivin poisto muokkauksessa.
//
// Rivit näkyvät ObjectFormissa JSON-tekstinä ilman aaltosulkeita
// ("location": "https://...").

const ACS_A = "https://sp.esimerkki.fi/saml/acs-a";
const ACS_B = "https://sp.esimerkki.fi/saml/acs-b";
const URI_A = "https://sp.esimerkki.fi/oidc/callback-a";
const URI_B = "https://sp.esimerkki.fi/oidc/callback-b";

const saveButton = (page: Page) =>
  page.getByRole("button", { name: "Tallenna", exact: true });

// ---------------------------------------------------------------------------
// SAML assertionConsumerServiceUrls (ObjectForm)
// ---------------------------------------------------------------------------

/** SAML-luonnos, jossa kaikki pakolliset kentät paitsi ACS on täytetty. */
async function startSamlWithoutAcs(page: Page, serviceName: string) {
  await createNewSpIntegration(page, "SAML");
  await fillServiceName(page, serviceName);
  await page
    .getByPlaceholder("Lisää Entity-ID")
    .fill("https://sp.esimerkki.fi/saml/metadata");
  const certInput = fieldRow(page, "signingCertificates").getByPlaceholder(
    "Lisää uusi signingCertificates"
  );
  await certInput.fill(TEST_SIGNING_CERT);
  await certInput.press("Enter");
}

const acsRow = (page: Page) => fieldRow(page, "assertionConsumerServiceUrls");

async function addAcs(page: Page, location: string) {
  const row = acsRow(page);
  await row.getByPlaceholder("Lisää location").fill(location);
  await row.getByRole("button", { name: "Lisää" }).click();
}

const acsEntry = (location: string) => `"location": "${location}"`;
// ObjectForm sets the auto index as a number, but the read-only InputForm
// may write it back as a string - either is accepted.
const acsIndex = (index: number) => new RegExp(`"index": "?${index}(?![0-9])`);

test.describe("ObjectForm: SAML assertionConsumerServiceUrls", () => {
  test("tyhjä tai virheellinen location ei lisää riviä", async ({ page }) => {
    await startSamlWithoutAcs(page, "ACS-validointitesti");
    const row = acsRow(page);

    // Pakollinen location tyhjänä: validateObject hylkää.
    await row.getByRole("button", { name: "Lisää" }).click();
    await expect(row.getByText("ei arvoja, pakollinen")).toBeVisible();

    // location vaatii https:n (config.ts validation ['uri','https']).
    await addAcs(page, "http://sp.esimerkki.fi/saml/acs");
    await expect(row.getByText("ei arvoja, pakollinen")).toBeVisible();
    await expect(row).not.toContainText(acsEntry("http://sp.esimerkki.fi/saml/acs"));
    await expect(saveButton(page)).toBeDisabled();

    await addAcs(page, ACS_A);
    await expect(row).toContainText(acsEntry(ACS_A));
    await expect(row.getByText("ei arvoja, pakollinen")).not.toBeVisible();
    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });
  });

  test("toinen rivi saa seuraavan indeksin ja isDefault tallentuu", async ({
    page,
  }) => {
    await startSamlWithoutAcs(page, "ACS-indeksitesti");
    const row = acsRow(page);

    await addAcs(page, ACS_A);
    await expect(row).toContainText(acsIndex(0));

    // isDefault-kytkin (oletus false) päälle toiselle riville.
    const isDefault = fieldRow(page, "isDefault").getByRole("checkbox");
    await expect(isDefault).not.toBeChecked();
    await isDefault.click();
    await expect(isDefault).toBeChecked();
    await addAcs(page, ACS_B);

    await expect(row).toContainText(acsEntry(ACS_A));
    await expect(row).toContainText(acsEntry(ACS_B));
    await expect(row).toContainText(acsIndex(1));
    // Lisäyksen jälkeen kentät tyhjenevät: kytkin palaa oletukseen.
    await expect(isDefault).not.toBeChecked();

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    const savedRow = acsRow(page);
    await expect(savedRow).toContainText(acsEntry(ACS_A));
    await expect(savedRow).toContainText(acsEntry(ACS_B));
    await expect(savedRow).toContainText(acsIndex(0));
    await expect(savedRow).toContainText(acsIndex(1));
    // Kytkimen arvo voi tallentua totuusarvona tai merkkijonona
    // (MetadataForm.updatObjectItem kirjoittaa merkkijonon), kuten index.
    await expect(savedRow).toContainText(/"isDefault": "?true"?/);
    await expect(savedRow).toContainText(/"isDefault": "?false"?/);
  });

  test("muokkaa palauttaa rivin kenttiin ja muutettu rivi tallentuu", async ({
    page,
  }) => {
    await startSamlWithoutAcs(page, "ACS-muokkaustesti");
    const row = acsRow(page);
    await addAcs(page, ACS_A);
    await expect(row).toContainText(acsEntry(ACS_A));

    // Muokkaus poistaa rivin listasta ja lataa sen arvot syöttökenttiin.
    await row.getByRole("button", { name: "muokkaa" }).click();
    await expect(row).not.toContainText(acsEntry(ACS_A));
    const location = row.getByPlaceholder("Lisää location");
    await expect(location).toHaveValue(ACS_A);

    await location.fill(ACS_B);
    await row.getByRole("button", { name: "Lisää" }).click();
    await expect(row).toContainText(acsEntry(ACS_B));
    await expect(row).not.toContainText(acsEntry(ACS_A));

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await expect(acsRow(page)).toContainText(acsEntry(ACS_B));
    await expect(acsRow(page)).not.toContainText(acsEntry(ACS_A));
  });

  test("rivin poisto: viimeisen poisto estää tallennuksen, poisto muokkauksessa tallentuu", async ({
    page,
  }) => {
    await startSamlWithoutAcs(page, "ACS-poistotesti");
    const row = acsRow(page);

    // Ainoan rivin poisto tekee pakollisesta listasta taas tyhjän.
    await addAcs(page, ACS_A);
    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });
    await row.getByRole("button", { name: "poista" }).click();
    await expect(row.getByText("ei arvoja, pakollinen")).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();

    await addAcs(page, ACS_A);
    await addAcs(page, ACS_B);
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    // Muokkauksessa pelkkä rivin poisto on tallennettava muutos.
    await openEditFromViewPage(page);
    const editRow = acsRow(page);
    await expect(editRow).toContainText(acsEntry(ACS_A));
    await editRow.getByRole("button", { name: "poista" }).first().click();
    await expect(editRow).not.toContainText(acsEntry(ACS_A));
    await expect(editRow).toContainText(acsEntry(ACS_B));
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await expect(acsRow(page)).toContainText(acsEntry(ACS_B));
    await expect(acsRow(page)).not.toContainText(acsEntry(ACS_A));
  });
});

// ---------------------------------------------------------------------------
// OIDC redirect_uris (ListForm)
// ---------------------------------------------------------------------------

const redirectInput = (page: Page) => page.getByPlaceholder("Lisää uusi redirect_uris");

/**
 * The redirect_uris row (label, list, input and its own "Lisää" button). The
 * label is translated, so the row is found from the input instead.
 */
const redirectRow = (page: Page): Locator =>
  redirectInput(page).locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-container ")][1]'
  );

async function startOidc(page: Page, serviceName: string) {
  await createNewSpIntegration(page, "OpenID Connect");
  await fillServiceName(page, serviceName);
}

async function addRedirectUri(page: Page, uri: string) {
  await redirectInput(page).fill(uri);
  await redirectInput(page).press("Enter");
  await expect(redirectRow(page).getByText(uri, { exact: true })).toBeVisible();
  await expect(redirectInput(page)).toHaveValue("");
}

test.describe("ListForm: OIDC redirect_uris", () => {
  test("Lisää-nappi lisää kelvollisen arvon ja tyhjentää kentän", async ({ page }) => {
    await startOidc(page, "Lisää-nappitesti");
    const row = redirectRow(page);

    await redirectInput(page).fill(URI_A);
    await row.getByRole("button", { name: "Lisää" }).click();

    await expect(row.getByText(URI_A, { exact: true })).toBeVisible();
    await expect(redirectInput(page)).toHaveValue("");
    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });
  });

  test("Lisää-nappi hylkää virheellisen arvon", async ({ page }) => {
    await startOidc(page, "Lisää-nappi-virhetesti");
    const row = redirectRow(page);
    const invalid = "https://sp.esimerkki.fi/oidc/callback#frag";

    await redirectInput(page).fill(invalid);
    await row.getByRole("button", { name: "Lisää" }).click();

    await expect(row.getByText("Kentässä ei saa olla # merkkiä!")).toBeVisible();
    await expect(row.getByText(invalid, { exact: true })).not.toBeVisible();
    await expect(row.getByText("ei arvoja, pakollinen")).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();
  });

  test("näppäily validoi arvon kirjoitettaessa", async ({ page }) => {
    await startOidc(page, "Näppäilyvalidointitesti");
    const row = redirectRow(page);
    const input = redirectInput(page);

    // pressSequentially: oikeat näppäinpainallukset (onKeyUp), ei fill().
    await input.pressSequentially("https://sp.esimerkki.fi/cb#");
    await expect(row.getByText("Kentässä ei saa olla # merkkiä!")).toBeVisible();

    await input.press("Backspace");
    await expect(input).toHaveValue("https://sp.esimerkki.fi/cb");
    await expect(row.getByText("Kentässä ei saa olla # merkkiä!")).not.toBeVisible();

    await input.press("Enter");
    await expect(row.getByText("https://sp.esimerkki.fi/cb", { exact: true })).toBeVisible();
  });

  test("tyhjä Enter ei lisää riviä", async ({ page }) => {
    await startOidc(page, "Tyhjä Enter -testi");
    const row = redirectRow(page);

    await redirectInput(page).press("Enter");

    await expect(row.getByText("ei arvoja, pakollinen")).toBeVisible();
    await expect(row.getByRole("listitem")).toHaveCount(0);
    await expect(saveButton(page)).toBeDisabled();
  });

  test("rivin poisto muokkauksessa tallentuu", async ({ page }) => {
    await startOidc(page, "Uri-poistotesti");
    await addRedirectUri(page, URI_A);
    await addRedirectUri(page, URI_B);
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    const row = redirectRow(page);
    await expect(row.getByText(URI_A, { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "poista" }).first().click();
    await expect(row.getByText(URI_A, { exact: true })).not.toBeVisible();
    await expect(row.getByText(URI_B, { exact: true })).toBeVisible();
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await expect(redirectRow(page).getByText(URI_B, { exact: true })).toBeVisible();
    await expect(redirectRow(page).getByText(URI_A, { exact: true })).not.toBeVisible();
  });
});
