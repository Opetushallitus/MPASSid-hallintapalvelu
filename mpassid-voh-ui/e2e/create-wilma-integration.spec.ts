import { expect, test } from "./fixtures";

// NOTE: this spec could not be run/iterated in the authoring environment
// (no network access to download Playwright's browser binaries there), so
// unlike the rest of this app's test history it has NOT been empirically
// verified against a real browser. The selectors below are derived directly
// from the source (src/routes/home/NewIntegrationSelection.tsx,
// src/routes/integraationMuokkaus/*) and from an earlier React Testing
// Library version of the same flow that WAS run and passed against the
// identical components. Run with `npx playwright test --headed --debug`
// first and expect to adjust a selector or two.

test("luo uusi Wilma-integraatio", async ({ page }) => {
  // The mock backend's default koodisto example for
  // "mpassidnsallimatoppilaitostyypit" only returns koodiArvo "12", which
  // doesn't match the fixture organization's only school
  // (oppilaitostyyppi "11", see schemas/blankIdpIntegration.json) - without
  // this the save button never enables because SchoolSelection can't match
  // any school to the chosen institution type. This override was proven
  // necessary in the Vitest/MSW version of this test; if Playwright's
  // page.route() doesn't intercept requests that end up going through the
  // MSW service worker in your Playwright version, this route.fulfill()
  // simply won't fire and you'll see the same "Tallenna" stays disabled
  // symptom - check the Network tab for this request first.
  await page.route(
    "**/koodisto-service/rest/json/mpassidnsallimatoppilaitostyypit/koodi",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { koodiArvo: "11", metadata: [{ kieli: "FI", nimi: "Peruskoulut" }] },
        ]),
      })
  );

  await page.goto("/");

  // AddIntegrationButton.tsx: <Fab aria-label={intl.formatMessage({defaultMessage:"lisää"})}>
  await page.getByLabel("lisää").click();

  const dialog = page.getByRole("dialog", { name: "Luo uusi integraatio" });
  await expect(dialog).toBeVisible();

  // organisaatio/integraatio auto-select to the first
  // APP_MPASSID_TALLENTAJA_* organization once /cas/me + organisaatio-nimet
  // resolve (NewIntegrationSelection.tsx useEffects) - the mock's default
  // /cas/me example already includes that group, so no manual organisaatio
  // pick should be needed. Each <Select id="..."> shares its id with its
  // sibling <InputLabel id="...">, so a bare #id locator is ambiguous
  // (strict-mode violation) - getByRole targets the combobox specifically.
  await expect(
    page.getByRole("combobox", { name: "integraatio:" })
  ).toHaveText(/Koulutustoimija/i, { timeout: 15_000 });

  await page.getByRole("combobox", { name: "tyyppi:" }).click();
  await page.getByRole("option", { name: "Wilma" }).click();

  await dialog.getByRole("button", { name: "Luo" }).click();

  await expect(page).toHaveURL(/\/muokkaa\/idp\/wilma\/0/);
  await expect(page.getByText("Organisaation tiedot")).toBeVisible();

  // hostname (Wilma-only mandatory field) - InputForm.tsx has no <label>,
  // only a placeholder ("Lisää " + field name).
  await page.getByPlaceholder("Lisää hostname").fill("koulu.inschool.fi");

  // Oppilaitostyypit (institution type) multi-select, backed by the
  // koodisto mock overridden above.
  const institutionTypesLabel = page.getByText("Oppilaitostyypit", {
    exact: true,
  });
  const institutionTypesRow = institutionTypesLabel.locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-container ")][1]'
  );
  await institutionTypesRow.getByRole("combobox").click();
  await page.getByRole("option", { name: /Peruskoulut/i }).click();
  await page.keyboard.press("Escape");

  // logo (mandatory for a new IdP integration) - real browser, so no
  // canvas/Image mocking needed like the RTL/jsdom version required.
  await page
    .getByLabel(/Valitse, logo on pakollinen/i)
    .setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      ),
    });

  // customDisplayName - filling this was necessary in the RTL version to
  // flip IntegrationDetails.tsx's canSave gate away from its
  // unchanged-from-original branch; keep it here for the same reason.
  // The field has a translated label ("OKJ:n näyttönimi"), so InputForm.tsx's
  // placeholder fallback ("Lisää " + raw field name) never applies here -
  // unlike hostname, which has no translation and renders "Lisää hostname"
  // literally. The rendered placeholder is "Lisää OKJ:n näyttönimi".
  await page
    .getByPlaceholder("Lisää OKJ:n näyttönimi")
    .fill("Mansikkalan koulu");

  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  await page.getByRole("button", { name: "OK" }).click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });
});
