import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  createNewSpIntegration,
  fillCommonIdpSteps,
  fillServiceName,
  fillWilmaFields,
  fillSamlMetadata,
  mockInstitutionTypes,
  saveIntegration,
} from "./helpers";

// Covers EHDOTETUT_TESTIT.md's "2. Integraatiovalinnat-välilehti" -
// IntegrationSelection/index.tsx. REDUCED SCOPE: the candidate table only
// ever lists role==="set" integrations (useIntegrationsSpecSearchPageable()
// hardcodes rooli=set whenever the path is /integraatio/:id,
// src/api/index.ts:21) and nothing anywhere in this app/mock ever
// constructs a `configurationEntity.set` integration - NewIntegrationSelect
// ion.tsx's "Palveluintegraatio" flow always yields `configurationEntity.sp`,
// and PossibleServices.tsx's "existing service" picker queries the same
// (always-empty) role=set list. So there is currently NO way, through the
// UI, to make even one row appear in this table - "allow one specific
// service"/"Olet sallimassa kaikki palvelut" (only reachable by manually
// deselecting the last individually-picked row, which requires a candidate
// row to exist) and the "Ei oikeuksia muuttaa sallittuja palveluja" (no
// write-access) scenario (would need to strip the fixture user's
// TALLENTAJA group via intercepting a live-mocked endpoint, unverified
// against this repo's MSW-service-worker setup) are both deliberately
// NOT covered below. Every test here only exercises the "Salli kaikki
// palvelut"/"Poista valinnat" mechanics, which work with zero candidates.
//
// Default-state note: for a brand-new idp integration `integration.
// permissions` is `undefined` (never set), which makes
// IntegrationTab/index.tsx:88-94 default `activateAllServices` to `true` -
// so out of the box the switch is ALREADY checked, not off as one might
// assume. `cannotSave()` (index.tsx:148-154) additionally short-circuits to
// `false` whenever `newIntegration.permissions` is `undefined` (regardless
// of `activateAllServices`), so the "Tallentaaksesi valinnat..." warning and
// disabled Save both show initially too - only "Poista valinnat" (which
// assigns a real, non-empty `permissions` array) or toggling the switch off
// change that.

test("Integraatiovalinnat-välilehti näkyy vain idp-integraatioille", async ({
  page,
}) => {
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
  // Confirmed against a real run: a brand-new integration's `permissions`
  // starts as `[]` (an empty array, not `undefined`) - `cannotSave()`
  // (index.tsx:148-154) treats a truthy (even empty) array combined with
  // `activateAllServices===true` as "save is fine", so this warning does
  // NOT show in the pristine default state (only after explicitly turning
  // "Salli kaikki palvelut" off - see the next test).
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
