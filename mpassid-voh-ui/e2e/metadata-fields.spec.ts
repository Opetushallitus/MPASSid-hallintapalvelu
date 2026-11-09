import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  createNewSpIntegration,
  fieldRow,
  fillOidcMetadata,
  fillSamlMetadata,
  fillServiceName,
  openEditFromViewPage,
  saveIntegration,
  TEST_SIGNING_CERT,
} from "./helpers";

// Palvelun metadatan kentät, joita muut testit eivät muuta (e2e-kattavuuden
// aukot Form/index.tsx MetadataFormissa ja Metadata.tsx:ssä):
// - OIDC: yksivalintaiset enum-kentät (multiselect: false ->
//   updateMultiSelectItem: arvo, ja "null" = "Ei arvoa" poistaa kentän) ja
//   generoidun client_secretin uudelleengenerointi.
// - SAML: metadatakytkin (updateSwitchItem) ja vapaaehtoinen
//   sertifikaattilista, jonka PEM-otsakkeet karsitaan (trim: 'cert').
// Tallennettu arvo tarkistetaan avaamalla muokkaus uudelleen.

const saveButton = (page: Page) =>
  page.getByRole("button", { name: "Tallenna", exact: true });

const selectIn = (page: Page, label: string) =>
  fieldRow(page, label).getByRole("combobox");

async function choose(page: Page, label: string, option: string) {
  await selectIn(page, label).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(page.getByRole("listbox")).not.toBeVisible();
}

async function newOidc(page: Page, name: string) {
  await createNewSpIntegration(page, "OpenID Connect");
  await fillServiceName(page, name);
  await fillOidcMetadata(page);
}

test.describe("OIDC-metadata", () => {
  test("token_endpoint_auth_method: oletus ja valittu arvo tallentuu", async ({ page }) => {
    await newOidc(page, "Token-endpoint-testi");
    await expect(selectIn(page, "token_endpoint_auth_method")).toHaveText(/client_secret_basic/);

    await choose(page, "token_endpoint_auth_method", "client_secret_post");
    await expect(selectIn(page, "token_endpoint_auth_method")).toHaveText(/client_secret_post/);

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await openEditFromViewPage(page);
    await expect(selectIn(page, "token_endpoint_auth_method")).toHaveText(/client_secret_post/);
  });

  test("id_token_signed_response_alg: HS256 tallentuu ja 'Ei arvoa' poistaa sen", async ({
    page,
  }) => {
    await newOidc(page, "Id-token-alg-testi");
    // The first enum value is "null": nothing is preselected.
    await expect(selectIn(page, "id_token_signed_response_alg")).not.toHaveText(/HS256/);

    await choose(page, "id_token_signed_response_alg", "HS256");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await expect(selectIn(page, "id_token_signed_response_alg")).toHaveText(/HS256/);

    await choose(page, "id_token_signed_response_alg", "Ei arvoa");
    await expect(selectIn(page, "id_token_signed_response_alg")).not.toHaveText(/HS256/);
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await expect(selectIn(page, "id_token_signed_response_alg")).not.toHaveText(/HS256/);
  });

  test("client_secret: uudelleengenerointi vaihtaa arvon", async ({ page }) => {
    await newOidc(page, "Client-secret-generointitesti");
    const row = fieldRow(page, "client_secret");
    const sha1 = /[0-9a-f]{40}/;

    // Generated on mount (generate: 'randomsha1').
    await expect(row).toContainText(sha1);
    const before = (await row.innerText()).match(sha1)![0];

    // The row's only button: the regenerate (LockReset) icon.
    await row.getByRole("button").click();
    await expect(row).not.toContainText(before);
    await expect(row).toContainText(sha1);
  });
});

test.describe("SAML-metadata", () => {
  test("authnRequestsSigned-kytkin: käännetty arvo tallentuu", async ({ page }) => {
    await createNewSpIntegration(page, "SAML");
    await fillServiceName(page, "AuthnRequestsSigned-testi");
    await fillSamlMetadata(page);

    // Testi: editable, default 'true' (config.ts).
    const toggle = fieldRow(page, "authnRequestsSigned").getByRole("checkbox");
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await openEditFromViewPage(page);
    await expect(fieldRow(page, "authnRequestsSigned").getByRole("checkbox")).not.toBeChecked();
  });

  test("encryptionCertificates: vapaaehtoinen, PEM-otsakkeet karsitaan tallennettaessa", async ({
    page,
  }) => {
    await createNewSpIntegration(page, "SAML");
    await fillServiceName(page, "EncryptionCertificates-testi");
    await fillSamlMetadata(page);

    const row = fieldRow(page, "encryptionCertificates");
    await expect(row.getByText("ei arvoja", { exact: true })).toBeVisible();
    // Not mandatory: saving is possible without one.
    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });

    // A text input drops line breaks, so the PEM arrives on one line.
    const input = row.getByPlaceholder("Lisää uusi encryptionCertificates");
    await input.fill(`-----BEGIN CERTIFICATE-----${TEST_SIGNING_CERT}-----END CERTIFICATE-----`);
    await input.press("Enter");
    await expect(row.getByText(TEST_SIGNING_CERT, { exact: true })).toBeVisible();
    await expect(row.getByText(/BEGIN CERTIFICATE/)).toHaveCount(0);

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await openEditFromViewPage(page);
    await expect(
      fieldRow(page, "encryptionCertificates").getByText(TEST_SIGNING_CERT, { exact: true })
    ).toBeVisible();
  });
});
