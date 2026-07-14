import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  createNewSpIntegration,
  fieldRow,
  fillCommonIdpSteps,
  fillServiceName,
  logBrowserConsole,
  mockInstitutionTypes,
} from "./helpers";

test("pakollinen kenttä tyhjänä estää tallennuksen (Wilma hostname)", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  // Deliberately NOT calling fillWilmaFields() - hostname (config.ts:1008-
  // 1022, mandatory:true) stays empty.
  await fillCommonIdpSteps(page, "Tyhja hostname -koulu");

  // No `attribuutti.hostname` translation exists, so InputForm.tsx:47-52's
  // label falls back to the raw attribute name.
  await expect(page.getByText("hostname on pakollinen kenttä")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true })
  ).toBeDisabled();
});

test("https-validointi: OIDC redirect_uris Tuotannossa vaatii https:n", async ({
  page,
}) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "OpenID Connect", "Tuotanto");
  await fillServiceName(page, "Https-validointitesti");

  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  // Plain http (no localhost) isolates the 'https' validator specifically -
  // config.ts:622-638's Tuotanto variant is ['uri','https','nolocalhost',
  // 'nohash'].
  await redirectUriInput.fill("http://sp-tuotanto.esimerkki.fi/callback");

  await expect(page.getByText("Kentän pitää olla https muodossa!")).toBeVisible();
  await redirectUriInput.press("Enter");
  // Rejected entries are never added to the list (ListForm.tsx:113-131 only
  // adds on a validate+isDirty pass) - the field stays empty/mandatory.
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true })
  ).toBeDisabled();
});

test("nolocalhost-validointi: OIDC redirect_uris Tuotannossa kieltää localhostin", async ({
  page,
}) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "OpenID Connect", "Tuotanto");
  await fillServiceName(page, "Nolocalhost-validointitesti");

  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  // https + localhost isolates the 'nolocalhost' validator specifically.
  await redirectUriInput.fill("https://localhost/callback");

  await expect(page.getByText("Localhost ei ole sallittu!")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true })
  ).toBeDisabled();
});

test("virheellinen sertifikaatti: SAML signingCertificates", async ({
  page,
}) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "SAML");
  await fillServiceName(page, "Sertifikaattivirhe-testi");

  const signingCertsRow = fieldRow(page, "signingCertificates");
  const signingCertInput = signingCertsRow.getByPlaceholder(
    "Lisää uusi signingCertificates"
  );
  // validateCert (Validators.tsx:76-117) tries `new X509Certificate(...)` -
  // any non-parseable string throws, caught and rendered as "Ei validi
  // certificate!" (Validators.tsx:148-150).
  await signingCertInput.fill("tama-ei-ole-sertifikaatti");

  await expect(page.getByText("Ei validi certificate!")).toBeVisible();
  await signingCertInput.press("Enter");
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true })
  ).toBeDisabled();
});

test("duplikaattiarvo ListForm-kentässä: OIDC redirect_uris", async ({
  page,
}) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "OpenID Connect");
  await fillServiceName(page, "Duplikaattitesti");

  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  const uri = "https://sp.esimerkki.fi/oidc/callback";
  await redirectUriInput.fill(uri);
  await redirectUriInput.press("Enter");
  await expect(page.getByText(uri, { exact: true })).toBeVisible();
  // ListForm.tsx clears the input (inputRef.current.value = "") only after
  // its onSubmit handler finishes - wait for that to actually land before
  // typing again, otherwise the second fill can race the first submit's
  // state update.
  await expect(redirectUriInput).toHaveValue("");

  await redirectUriInput.fill(uri);
  await redirectUriInput.press("Enter");

  await expect(
    page.getByText("Tämä redirect_uris on jo olemassa")
  ).toBeVisible();
  // Still only one entry in the list - the duplicate was not added again.
  await expect(page.getByText(uri, { exact: true })).toHaveCount(1);
});

test("array-kentän rivin poisto tekee pakollisesta kentästä taas tyhjän", async ({
  page,
}) => {
  logBrowserConsole(page);

  await createNewSpIntegration(page, "OpenID Connect");
  await fillServiceName(page, "Rivinpoistotesti");

  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  const uri = "https://sp.esimerkki.fi/oidc/callback";
  await redirectUriInput.fill(uri);
  await redirectUriInput.press("Enter");

  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });

  // ListForm.tsx:146-154's delete IconButton - "kommentti" aria-label is
  // shared by every row on the page (a copy/paste leftover, see helpers.ts/
  // EHDOTETUT_TESTIT.md), but redirect_uris is the only array field with an
  // entry here, so it's unambiguous.
  await page.getByLabel("kommentti", { exact: true }).click();

  await expect(page.getByText("ei arvoja, pakollinen")).toBeVisible();
  await expect(saveButton).toBeDisabled();
});
