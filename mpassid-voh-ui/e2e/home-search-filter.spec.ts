import { expect, test } from "@playwright/test";
import {
  columnHeaderCell,
  createNewIdpIntegration,
  createNewSpIntegrationHere,
  fillCommonIdpSteps,
  fillServiceName,
  fillWilmaFields,
  goHomeWithoutReload,
  logBrowserConsole,
  mockInstitutionTypes,
  saveIntegration,
} from "./helpers";


test("haku organisaation nimellä, tyhjennys ja tyhjä tulos", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  const hostname = "hakutesti.inschool.fi";
  await fillWilmaFields(page, hostname);
  await fillCommonIdpSteps(page, "Hakutestin koulu");
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);

  await goHomeWithoutReload(page);
  await expect(page.getByText(hostname, { exact: true })).toBeVisible();

  const searchInput = page.getByPlaceholder(
    "Etsi nimellä, OID:lla tai y-tunnuksella"
  );
  const searchSubmit = page.getByLabel("etsi", { exact: true });

  // Submit stays disabled until the field is dirty (SearchForm.tsx:79).
  await expect(searchSubmit).toBeDisabled();

  await searchInput.fill("Mansikkalan");
  await expect(searchSubmit).toBeEnabled();
  await searchSubmit.click();
  await expect(page.getByText(hostname, { exact: true })).toBeVisible();

  await searchInput.fill("ei-loydy-mistaan-xyz");
  await searchSubmit.click();
  await expect(
    page.getByText("Valitsemillasi hakuehdoilla ei löytynyt yhtään integraatiota.")
  ).toBeVisible();
  await expect(page.getByText(hostname, { exact: true })).not.toBeVisible();

  await page.getByLabel("tyhjennä", { exact: true }).click();
  await expect(searchInput).toHaveValue("");
  await expect(page.getByText(hostname, { exact: true })).toBeVisible();
});

test("Tunniste-sarakkeen lajittelu", async ({ page }) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, "lajittelu-eka.inschool.fi");
  await fillCommonIdpSteps(page, "Lajittelu eka");
  await saveIntegration(page);
  const firstId = new URL(page.url()).pathname.split("/").pop()!;

  // createNewSpIntegrationHere(), NOT createNewIdpIntegration() - the
  // latter's page.goto("/") would wipe the first integration just created
  // from the mock's in-memory allIntegrations (see school-selection.spec.ts's
  // identical caveat for createSiblingIdpIntegration()). Using an SP (OIDC)
  // integration here instead of a second idp also sidesteps a real
  // interaction: any second idp integration sharing "Peruskoulut" (which
  // fillCommonIdpSteps always selects) would see the first one as a
  // school-selection sibling (both idp integrations always default to
  // Tuotanto, confirmed in environment-switch.spec.ts), forcing an explicit
  // school pick before Tallenna enables - irrelevant noise for a sort test.
  await goHomeWithoutReload(page);
  await createNewSpIntegrationHere(page, "OpenID Connect");
  await fillServiceName(page, "Lajittelu toka");
  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill("https://sp.esimerkki.fi/oidc/callback");
  await redirectUriInput.press("Enter");
  await saveIntegration(page);
  const secondId = new URL(page.url()).pathname.split("/").pop()!;

  await goHomeWithoutReload(page);

  const rows = page.locator(".MuiTableBody-root .MuiTableRow-root");

  // First click sorts ascending (TableCellWithSortAndRouterIntegration.tsx:
  // 43-62) - the lower (earlier-created) id should come first.
  await page.getByRole("button", { name: "Tunniste", exact: true }).click();
  await expect(rows.first()).toContainText(firstId);

  // Second click flips to descending - the higher id comes first. The
  // button's accessible name now has a hidden "järjestetty ..." suffix
  // appended (TableCellWithSortAndRouterIntegration.tsx:65-75), so match by
  // substring instead of exact.
  await page.getByRole("button", { name: /^Tunniste/ }).click();
  await expect(rows.first()).toContainText(secondId);
});

test("Näytä sivulla -valinta vaihtaa rivimäärän", async ({ page }) => {
  logBrowserConsole(page);

  await page.goto("/");

  const rowsPerPage = page.getByRole("combobox", { name: /Näytä sivulla/ });
  await rowsPerPage.click();
  await page.getByRole("option", { name: "25", exact: true }).click();

  await expect(
    page.getByRole("combobox", { name: /Näytä sivulla/ })
  ).toHaveAccessibleName(/25/);
  // The "määrä" search param name gets percent-encoded in the raw URL
  // (non-ASCII characters, e.g. "m%C3%A4%C3%A4r%C3%A4=25") - decode via
  // URLSearchParams instead of regex-matching the raw string.
  expect(new URL(page.url()).searchParams.get("määrä")).toBe("25");
});

test("Ympäristö-suodatin näyttää vain valitun ympäristön integraatiot", async ({
  page,
}) => {
  await mockInstitutionTypes(page);
  logBrowserConsole(page);

  // idp integrations always default to Tuotanto and can never reach Testi
  // again once past it (see environment-switch.spec.ts's file comment), so
  // "one Testi + one Tuotanto" has to mean one SP (genuinely Testi, fixed at
  // creation) + one idp (always Tuotanto) here, not two idps.
  await createNewIdpIntegration(page, "Wilma");
  const tuotantoHostname = "suodatin-tuotanto.inschool.fi";
  await fillWilmaFields(page, tuotantoHostname);
  await fillCommonIdpSteps(page, "Suodatin Tuotanto");
  await saveIntegration(page);
  await expect(page.getByText("Tuotanto", { exact: true })).toBeVisible();

  await goHomeWithoutReload(page);
  await createNewSpIntegrationHere(page, "OpenID Connect", "Testi");
  const testiServiceName = "Suodatin Testi -palvelu";
  await fillServiceName(page, testiServiceName);
  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill("https://sp.esimerkki.fi/oidc/callback");
  await redirectUriInput.press("Enter");
  await saveIntegration(page);

  await goHomeWithoutReload(page);
  // Not exact:true for the SP row - IntegrationsTable.tsx's "sp" cell
  // renders the service name and its UniqueId (client_id) as two adjacent
  // text children of the same <Stack>, with no wrapping element of its own
  // around just the name - so no single element's full text is exactly the
  // service name alone (confirmed against a real run).
  await expect(page.getByText(testiServiceName)).toBeVisible();
  await expect(
    page.getByText(tuotantoHostname, { exact: true })
  ).toBeVisible();

  // The kebab button is wrapped in a MUI <Fade in={hover}> (Menu.tsx:38) -
  // it only becomes visible/actionable once the header cell is hovered, so
  // a bare .click() would just time out waiting for it to appear.
  const ympäristöHeaderCell = columnHeaderCell(page, "Ympäristö");
  await ympäristöHeaderCell.hover();
  await ympäristöHeaderCell
    .getByRole("button", { name: /valikko sarakkeelle/ })
    .click();
  // The menu opens with every value already checked (unfiltered = show
  // everything) - clicking "Tuotanto" itself would UNCHECK it (hiding
  // Tuotanto instead of isolating it). To show only Tuotanto, uncheck the
  // other two values instead.
  await page.getByRole("checkbox", { name: "Testi", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Tuotanto-Testi", exact: true })
    .click();

  await expect(page.getByText(tuotantoHostname, { exact: true })).toBeVisible();
  await expect(page.getByText(testiServiceName)).not.toBeVisible();
});
