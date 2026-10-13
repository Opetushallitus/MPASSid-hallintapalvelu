import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  deleteIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
} from "./helpers";

// Covers EHDOTETUT_TESTIT.md's "1. Integraation poisto/deaktivointi" -
// integraationMuokkaus/index.tsx:266-337. Deleting reuses the exact same
// saveIntegration()-click-handler/dialog chain as a normal save (only
// `isDisabled` differs, swapping "Tallenna" for "Poista" and calling
// `inactivateIntegration({id})` instead of create/update) - see
// deleteIntegration()'s doc comment in helpers.ts.

test("poisto onnistuu ja ohjaa etusivulle", async ({ page }) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Wilma");
  const hostname = "poistettava.inschool.fi";
  await fillWilmaFields(page, hostname);
  await fillCommonIdpSteps(page, "Poistettava koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await deleteIntegration(page);

  // closeNotice() (index.tsx:85-97) navigates to "/" when isDisabled.
  await expect(page).toHaveURL("/");

  // Confirmed against a real run: the mock's inactivateIntegration handler
  // (requestLogicHandlers.ts) is a no-op - it doesn't mark the integration
  // inactive, and getIntegrationsSpecSearchPageable never filters on
  // active/status at all (the "Passiiviset" switch's query param is sent but
  // silently ignored) - so the deleted integration keeps showing up in BOTH
  // the default and "Passiiviset" views here. That's a genuine mock gap, not
  // something this e2e suite can paper over without changing default search
  // behavior for every other test - so the only reliably assertable outcome
  // of a delete in this mock is the navigation above.
});

test("poiston peruutus vahvistusdialogista ei poista integraatiota", async ({
  page,
}) => {
  await mockInstitutionTypes(page);

  await createNewIdpIntegration(page, "Wilma");
  const hostname = "sailytettava.inschool.fi";
  await fillWilmaFields(page, hostname);
  await fillCommonIdpSteps(page, "Säilytettävä koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await openEditFromViewPage(page);
  await page.getByLabel("poista", { exact: true }).click();
  await page.getByRole("button", { name: "Poista", exact: true }).click();

  await expect(
    page.getByText("Olet poistamassa integraation tietoja")
  ).toBeVisible();
  await expect(page.getByText("Haluatko varmasti poistaa?")).toBeVisible();

  // The dialog's own "PERUUTA" only closes the dialog (index.tsx:328-331) -
  // it does NOT reset `isDisabled` back to false, so the Snackbar still
  // shows "Poista" (not "Tallenna") afterward. Toggling the delete icon a
  // second time is what actually reverts the UI, proving nothing was
  // deleted and the screen is still fully usable.
  await page.getByRole("button", { name: "PERUUTA", exact: true }).click();
  await expect(
    page.getByText("Olet poistamassa integraation tietoja")
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Poista", exact: true })
  ).toBeVisible();

  await page.getByLabel("poista", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tallenna", exact: true })
  ).toBeVisible();

  // Prove the integration itself is untouched: a normal save still works.
  // Re-opening an unmodified, already-valid integration for edit does NOT
  // enable "Tallenna" by itself (confirmed against a real run - canSave only
  // flips true once a field's onChange actually fires) - every other edit
  // spec in this suite changes a field before saving for the same reason.
  await page.getByPlaceholder("Lisää hostname").fill(`${hostname}-v2`);
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);
});
