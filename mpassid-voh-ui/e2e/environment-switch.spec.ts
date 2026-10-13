import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  fieldRow,
  fillCommonIdpSteps,
  fillWilmaFields,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
  selectEnvironment,
} from "./helpers";

// Covers EHDOTETUT_TESTIT.md's "5. Testi->Tuotanto-vaihto olemassa olevalle
// idp-integraatiolle" - Role/IdentityProvider.tsx:141-169's "Palveluympäristö"
// selector, rendered (and editable) any time `environment.current>-1`, which
// is true for both create and edit.
//
// REVISED PREMISE (confirmed against a real run): idp integrations do NOT
// default to Testi. NewIntegrationSelection.tsx:214-216 unconditionally sets
// `result.deploymentPhase=1` (Tuotanto) for every new idp integration,
// regardless of anything the user picks - so a freshly created idp
// integration is ALREADY Tuotanto before "Palveluympäristö" is ever touched.
// Worse, `environmentValues` (IdentityProvider.tsx:83) filters the dropdown
// to `env!=="0"||integration.deploymentPhase===0` - "Testi" (value "0") is
// only offered while the integration's OWN deploymentPhase is already 0.
// Once an idp integration is Tuotanto (i.e. always, from creation onward),
// "Testi" never appears as an option again - there is no UI path back to it.
// So neither "Testi -> Tuotanto" nor "Tuotanto -> Testi" is actually
// reachable for an idp integration; the only real transition available from
// the default state is Tuotanto -> Tuotanto-Testi (value 2, always included
// in the filter).
//
// No sibling idp integration exists here, so SchoolSelection's eSI/eSE stay
// null throughout (same shape as school-selection.spec.ts's s0/m0).

test("olemassa olevan idp-integraation ympäristön vaihto Tuotanto -> Tuotanto-Testi", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "tuotannosta-tuotanto-testiin.inschool.fi");
  await fillCommonIdpSteps(page, "Ympäristönvaihtokoulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/(\d+)/);

  // Confirms the "always Tuotanto by default" premise above.
  await expect(page.getByText("Tuotanto", { exact: true })).toBeVisible();

  await openEditFromViewPage(page);
  await selectEnvironment(page, "Tuotanto-Testi");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await expect(page.getByText("Tuotanto-Testi", { exact: true })).toBeVisible();
  // NOT re-verified across a page.reload() - a hard reload wipes the mock's
  // in-memory allIntegrations (same caveat as everywhere else in this
  // suite), so the integration created earlier in this same test would
  // simply no longer exist afterward - that would test the 404 path, not
  // persistence.
});

test("'Testi' ei ole enää valittavissa kun idp-integraatio on jo Tuotannossa", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "ei-enaa-testiin.inschool.fi");
  await fillCommonIdpSteps(page, "Ei paluuta Testiin -koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/(\d+)/);

  await openEditFromViewPage(page);
  await fieldRow(page, "Palveluympäristö").getByRole("combobox").click();

  await expect(page.getByRole("option", { name: "Testi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "Tuotanto-Testi", exact: true })).toBeVisible();
});
