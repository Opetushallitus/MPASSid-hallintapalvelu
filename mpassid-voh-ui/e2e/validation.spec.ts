import { expect, test } from "./fixtures";
import { testCertificate } from "./certs";
import {
  createNewIdpIntegration,
  createNewSpIntegration,
  fieldRow,
  fillAzureFields,
  fillCommonIdpSteps,
  fillOpinsysFields,
  fillServiceName,
  fillWilmaFields,
  mockInstitutionTypes,
} from "./helpers";

// Validoinnin negatiivipolut -
// src/utils/Validators.tsx, config.ts's per-field `validation` arrays,
// Form/ListForm.tsx. No field in config.ts uses the "ip" validator (grepped
// - only `redirect_uris`/nohash and signingCertificates/cert exist among
// the ones originally proposed), so that specific rule is not covered here.

test("pakollinen kenttä tyhjänä estää tallennuksen (Wilma hostname)", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

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
  await createNewSpIntegration(page, "OpenID Connect");
  await fillServiceName(page, "Rivinpoistotesti");

  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  const uri = "https://sp.esimerkki.fi/oidc/callback";
  await redirectUriInput.fill(uri);
  await redirectUriInput.press("Enter");

  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });

  // ListForm's delete IconButton - the "poista" aria-label is shared by every
  // row on the page, but redirect_uris is the only array field with an entry
  // here, so it's unambiguous.
  await page.getByLabel("poista", { exact: true }).click();

  await expect(page.getByText("ei arvoja, pakollinen")).toBeVisible();
  await expect(saveButton).toBeDisabled();
});

// ---------------------------------------------------------------------------
// The remaining validators config.ts uses: binddn (Opinsys clientId), date
// (Azure clientKeyValidUntil), expert (Wilma datasource) and the
// certificate validity warnings (Validators.tsx validateCertText).
// ---------------------------------------------------------------------------

test("binddn-validointi: Opinsys clientId vaatii dc=-osat", async ({ page }) => {
  await mockInstitutionTypes(page);
  await createNewIdpIntegration(page, "Opinsys");
  await fillOpinsysFields(page);
  await fillCommonIdpSteps(page, "Binddn-validointikoulu");
  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });

  const clientId = page.getByPlaceholder("Lisää Client ID", { exact: true });
  await clientId.fill("ou=koulu,o=mansikkala");
  await expect(page.getByText("bind dn ei ole validi!")).toBeVisible();
  await expect(saveButton).toBeDisabled();

  await clientId.fill("uid=mpassid,ou=palvelut,dc=example,dc=fi");
  await expect(page.getByText("bind dn ei ole validi!")).not.toBeVisible();
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
});

test("päivämäärävalidointi: Azure clientKeyValidUntil vaatii pp-kk-vvvv-muodon", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  await createNewIdpIntegration(page, "Azure");
  await fillAzureFields(page);
  await fillCommonIdpSteps(page, "Päivämäärävalidointikoulu");
  const saveButton = page.getByRole("button", { name: "Tallenna", exact: true });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });

  const validUntil = page.getByPlaceholder("Lisää Client Keyn voimassaolo", { exact: true });
  await validUntil.fill("2030-12-31");
  await expect(page.getByText("Kentän pitää olla pp-kk-vvvv muodossa!")).toBeVisible();
  await expect(saveButton).toBeDisabled();

  await validUntil.fill("31-12-2030");
  await expect(page.getByText("Kentän pitää olla pp-kk-vvvv muodossa!")).not.toBeVisible();
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
});

test("expert-kenttä: Wilman Data source näyttää varoituksen", async ({ page }) => {
  await mockInstitutionTypes(page);
  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "expert-varoitus.inschool.fi");

  // datasource: validation ['expert'] - not a rule, only this warning.
  await expect(
    fieldRow(page, "Data source").getByText(
      "VAROITUS älä koske tähän jollei erikseen ohjeistettu!"
    )
  ).toBeVisible();
});

test.describe("sertifikaatin voimassaolovaroitukset: SAML signingCertificates", () => {
  const scenarios = [
    { name: "vanhentunut", validFromDays: -400, validToDays: -30, warning: /Certificate ei ole enään validi: / },
    { name: "voimassa alle 6 kk", validFromDays: -30, validToDays: 60, warning: /Certificate on validi alle 6kk: / },
    { name: "ei vielä voimassa", validFromDays: 30, validToDays: 400, warning: /Certificate ei ole vielä validi: / },
  ];

  for (const scenario of scenarios) {
    test(`${scenario.name} sertifikaatti näyttää varoituksen`, async ({ page }) => {
      const cert = await testCertificate(scenario.validFromDays, scenario.validToDays);
      await createNewSpIntegration(page, "SAML");
      await fillServiceName(page, `Sertifikaattivaroitus ${scenario.name}`);

      const signingCertInput = fieldRow(page, "signingCertificates").getByPlaceholder(
        "Lisää uusi signingCertificates"
      );
      await signingCertInput.fill(cert);

      await expect(fieldRow(page, "signingCertificates").getByText(scenario.warning)).toBeVisible();
      // A parseable certificate is still accepted - the validity is only a warning.
      await signingCertInput.press("Enter");
      await expect(fieldRow(page, "signingCertificates").getByText(cert, { exact: true })).toBeVisible();
    });
  }

  test("voimassa yli 6 kk: ei varoitusta", async ({ page }) => {
    const cert = await testCertificate(-30, 400);
    await createNewSpIntegration(page, "SAML");
    await fillServiceName(page, "Sertifikaattivaroitus ei varoitusta");

    await fieldRow(page, "signingCertificates")
      .getByPlaceholder("Lisää uusi signingCertificates")
      .fill(cert);

    await expect(fieldRow(page, "signingCertificates").getByText(/^Certificate /)).toHaveCount(0);
    await expect(fieldRow(page, "signingCertificates").getByText("Ei validi certificate!")).toHaveCount(0);
  });
});
