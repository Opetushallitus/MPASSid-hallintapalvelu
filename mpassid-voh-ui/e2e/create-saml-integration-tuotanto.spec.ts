import { expect, test } from "./fixtures";
import {
  createNewSpIntegration,
  fieldRow,
} from "./helpers";

// Tuotanto-versio create-saml-integration.spec.ts:sta - identtinen muuten,
// paitsi että "palvelu:"-valikosta valitaan "Tuotanto - uusi"
// "Testi - uusi":n sijaan (PossibleServices.tsx:86-94). SP-integraatioilla
// ei ole Palveluympäristö-valitsinta luonnin jälkeen
// (ServiceProvider.tsx:66-79 vain näyttää sen), niin ympäristö on
// valittava tässä, luontivaiheessa - ks. createNewSpIntegration()'s
// helpers.ts:ssä oleva kommentti.
//
// See create-saml-integration.spec.ts for the signing certificate's
// provenance/disclaimer - identical throwaway cert reused here.
const TEST_SIGNING_CERT =
  "MIIDFzCCAf+gAwIBAgIUSjO/iUT2Q9GUAo94L0JU6vAKAdowDQYJKoZIhvcNAQELBQAwGzEZMBcGA1UEAwwQbXBhc3NpZC1lMmUtdGVzdDAeFw0yNjA3MTMwODQ5MjlaFw0zNjA3MTAwODQ5MjlaMBsxGTAXBgNVBAMMEG1wYXNzaWQtZTJlLXRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCgi76hkLU8YEJGbg1uqnhwiOCUTceZOLkhJe1SCb+WbXwc03SnmGLfmzfFVblhwGHmwrwRP6AFqeJqpJs4tnSr3FdbeSrNq5TgcJF2+J/6DKX8c9q4HShmfLzmyjUXL/kQh3w4If4V5lAxWch0YNP/tiodkdFyN4XUtzqV7V4rHlmA1jJ97Ek/fBTJ9O9pAG//xROMLf8/HkpTQuggYOscwuK4iXWr1Cqgjg4QBk6H5D0nLFq3kE70cThUf7gO/zqi7TqTsVRYTxSAMqBVDFOQhYQCUSTIrxFDy2PARtiuQV2w1lkvANxLgEf5A6LgdrMhEKj4Vdjy3IFVlUXZaO4JAgMBAAGjUzBRMB0GA1UdDgQWBBTcupUfhuQesM9qiMH1QK5u/wI80jAfBgNVHSMEGDAWgBTcupUfhuQesM9qiMH1QK5u/wI80jAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAedR2xXYwNOLO3kdq/KPnfcrQRJew93xv3ORdgTjpkEy0H08JoNUfaTtwCQ72+t9vKNyFIBrPF6u0lKNcQrc+QJ1U5cvJfUiNnSUtcqhA1kHqlufsk3x7ijgTineoUy6Z/ZN172K0D1JNZl45CPfWzbzog1A+lrLoPVsdcAxkIvBsYe6A2ELrSWEghAxC7NnFyeF/C02qCcs7xluCDDeptw0IXFLRc37UNrZEfEOYCxEWNFVw3Ic8zY6c8zt7ACNM5hWsjfcM/srzdKT5xzTBnt7tLend4PuWPVOEJOEj1cMMCyFvsS4jxIhrTOXvDKT9rwWZ+Aji/0Mfr4NlkfltZ";

test("luo uusi SAML-palveluintegraatio Tuotanto-ympäristöön", async ({
  page,
}) => {
  await createNewSpIntegration(page, "SAML", "Tuotanto");

  await expect(page).toHaveURL(/\/muokkaa\/sp\/saml\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();
  await expect(page.getByText("Palveluiden yhteiset tiedot")).toBeVisible();

  await page
    .getByPlaceholder("Lisää palvelun nimi", { exact: true })
    .fill("Mansikkalan tuotanto SAML-palvelu");

  await expect(page.getByText("Palvelun metadata tiedot")).toBeVisible();

  // Contrast with create-saml-integration.spec.ts's Testi assertion:
  // wantAssertionsSigned's Tuotanto variant (config.ts:733-755) has
  // defaultValue:'true' (confirmed checked below). config.ts also marks this
  // variant `editable:false`, but confirmed against a real run: the switch
  // stays interactively enabled here regardless - Metadata.tsx resolves the
  // switch's checked VALUE from the correct environment-specific config row
  // (hence "checked" below matching defaultValue:'true'), but something in
  // that same resolution doesn't end up disabling the control to match - not
  // investigated further since it doesn't affect the actual save/environment
  // behavior this suite otherwise verifies (deploymentPhase is set from the
  // "palvelu:" dialog choice, independent of this switch).
  const wantAssertionsSignedSwitch = fieldRow(
    page,
    "wantAssertionsSigned"
  ).getByRole("checkbox");
  await expect(wantAssertionsSignedSwitch).toBeChecked();

  await page
    .getByPlaceholder("Lisää Entity-ID")
    .fill("https://sp-tuotanto.esimerkki.fi/saml/metadata");

  const acsRow = fieldRow(page, "assertionConsumerServiceUrls");
  await acsRow
    .getByPlaceholder("Lisää location")
    .fill("https://sp-tuotanto.esimerkki.fi/saml/acs");
  await acsRow.getByRole("button", { name: "Lisää" }).click();

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
