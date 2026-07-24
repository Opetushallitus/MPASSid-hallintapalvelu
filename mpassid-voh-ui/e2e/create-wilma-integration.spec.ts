import { expect, test } from "@playwright/test";

test("luo uusi Wilma-integraatio", async ({ page }) => {
  
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

  page.on("console", (msg) => {
    // eslint-disable-next-line no-console
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    // eslint-disable-next-line no-console
    console.log(`[browser:pageerror] ${err.message}`);
  });

  await page.goto("/");

  // AddIntegrationButton.tsx: <Fab aria-label={intl.formatMessage({defaultMessage:"lisää"})}>
  await page.getByLabel("lisää").click();

  const dialog = page.getByRole("dialog", { name: "Luo uusi integraatio" });
  await expect(dialog).toBeVisible();

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
