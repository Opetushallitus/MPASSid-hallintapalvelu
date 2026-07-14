import { expect, test } from "@playwright/test";
import {
  createNewSpIntegration,
  fieldRow,
  logBrowserConsole,
} from "./helpers";

const TEST_SIGNING_CERT =
  "MIIDFzCCAf+gAwIBAgIUSjO/iUT2Q9GUAo94L0JU6vAKAdowDQYJKoZIhvcNAQELBQAwGzEZMBcGA1UEAwwQbXBhc3NpZC1lMmUtdGVzdDAeFw0yNjA3MTMwODQ5MjlaFw0zNjA3MTAwODQ5MjlaMBsxGTAXBgNVBAMMEG1wYXNzaWQtZTJlLXRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCgi76hkLU8YEJGbg1uqnhwiOCUTceZOLkhJe1SCb+WbXwc03SnmGLfmzfFVblhwGHmwrwRP6AFqeJqpJs4tnSr3FdbeSrNq5TgcJF2+J/6DKX8c9q4HShmfLzmyjUXL/kQh3w4If4V5lAxWch0YNP/tiodkdFyN4XUtzqV7V4rHlmA1jJ97Ek/fBTJ9O9pAG//xROMLf8/HkpTQuggYOscwuK4iXWr1Cqgjg4QBk6H5D0nLFq3kE70cThUf7gO/zqi7TqTsVRYTxSAMqBVDFOQhYQCUSTIrxFDy2PARtiuQV2w1lkvANxLgEf5A6LgdrMhEKj4Vdjy3IFVlUXZaO4JAgMBAAGjUzBRMB0GA1UdDgQWBBTcupUfhuQesM9qiMH1QK5u/wI80jAfBgNVHSMEGDAWgBTcupUfhuQesM9qiMH1QK5u/wI80jAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAedR2xXYwNOLO3kdq/KPnfcrQRJew93xv3ORdgTjpkEy0H08JoNUfaTtwCQ72+t9vKNyFIBrPF6u0lKNcQrc+QJ1U5cvJfUiNnSUtcqhA1kHqlufsk3x7ijgTineoUy6Z/ZN172K0D1JNZl45CPfWzbzog1A+lrLoPVsdcAxkIvBsYe6A2ELrSWEghAxC7NnFyeF/C02qCcs7xluCDDeptw0IXFLRc37UNrZEfEOYCxEWNFVw3Ic8zY6c8zt7ACNM5hWsjfcM/srzdKT5xzTBnt7tLend4PuWPVOEJOEj1cMMCyFvsS4jxIhrTOXvDKT9rwWZ+Aji/0Mfr4NlkfltZ";

test("luo uusi SAML-palveluintegraatio", async ({ page }) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "SAML");

  await expect(page).toHaveURL(/\/muokkaa\/sp\/saml\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();
  await expect(page.getByText("Palveluiden yhteiset tiedot")).toBeVisible();

  await page
    .getByPlaceholder("Lisää palvelun nimi", { exact: true })
    .fill("Mansikkalan testi SAML-palvelu");

  await expect(page.getByText("Palvelun metadata tiedot")).toBeVisible();

  const wantAssertionsSignedSwitch = fieldRow(
    page,
    "wantAssertionsSigned"
  ).getByRole("checkbox");
  await expect(wantAssertionsSignedSwitch).not.toBeChecked();
  await expect(wantAssertionsSignedSwitch).toBeEnabled();

  // entityId: mandatory, no format validation (config.ts:820-839).
  await page
    .getByPlaceholder("Lisää Entity-ID")
    .fill("https://sp.esimerkki.fi/saml/metadata");

  // assertionConsumerServiceUrls: mandatory object array (config.ts:756-
  // 776,940-1007). Fill the nested "location" field (validation ['uri',
  // 'https']) then click the row's own "Lisää" add button - there are
  // several "Lisää" buttons on this page (one per array field), so this
  // must be scoped to the assertionConsumerServiceUrls row specifically
  // (see helpers.ts fieldRow doc comment).
  const acsRow = fieldRow(page, "assertionConsumerServiceUrls");
  await acsRow
    .getByPlaceholder("Lisää location")
    .fill("https://sp.esimerkki.fi/saml/acs");
  await acsRow.getByRole("button", { name: "Lisää" }).click();

  // signingCertificates: mandatory array of certificates (config.ts:840-
  // 860). Rendered as a plain text field ("Lisää uusi signingCertificates")
  // that adds its current value to the list on Enter (ListForm.tsx:162-
  // 185) - no separate confirm click needed.
  const signingCertsRow = fieldRow(page, "signingCertificates");
  const signingCertInput = signingCertsRow.getByPlaceholder(
    "Lisää uusi signingCertificates"
  );
  await signingCertInput.fill(TEST_SIGNING_CERT);
  await signingCertInput.press("Enter");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
