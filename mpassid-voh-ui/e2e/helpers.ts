import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Overrides the koodisto lookup for institution types so it matches the
 * fixture organization's only "peruskoulu" school (oppilaitostyyppi_11, see
 * schemas/blankIdpIntegration.json - every idp fixture shares the same
 * "Mansikkalan testi kunta" organization/schools). Without this the
 * mock's default example (koodiArvo "12") never matches, and SchoolSelection
 * can't match any school to the chosen institution type, so "Tallenna"
 * never enables for ANY idp integration type, not just Wilma.
 */
export async function mockInstitutionTypes(page: Page) {
  await page.route(
    "**/koodisto-service/rest/json/mpassidnsallimatoppilaitostyypit/koodi",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { koodiArvo: "11", metadata: [{ kieli: "FI", nimi: "Peruskoulut" }] },
          // "15" (Lukiot) added for school-selection.spec.ts's multi-type (m-series)
          // scenarios - matches schools/organizations.json's "Mansikkalan testi
          // lukio" (30077), the fixture's only oppilaitostyyppi_15 school.
          { koodiArvo: "15", metadata: [{ kieli: "FI", nimi: "Lukiot" }] },
        ]),
      })
  );
}

/** Surfaces browser console/page errors in the test output - see
 * create-wilma-integration.spec.ts for why this matters (MSW worker.start()
 * has no .catch() in src/main.tsx, so failures there show up as a silent
 * blank page otherwise). */
export function logBrowserConsole(page: Page) {
  page.on("console", (msg) => {
    // eslint-disable-next-line no-console
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    // eslint-disable-next-line no-console
    console.log(`[browser:pageerror] ${err.message}`);
  });
}

/**
 * Navigates back to "/" via the app's own client-side router (clicking the
 * "Integraatiot" nav tab) instead of page.goto("/"). page.goto() is a real
 * browser navigation - it re-executes every JS module from scratch, which
 * resets requestLogicHandlers.ts's module-scope `let allIntegrations =
 * exampleData...` back to its pristine initial state. That's invisible to
 * single-integration-per-test specs (goto only ever happens once, at the very
 * start), but school-selection.spec.ts's tests create a "sibling" integration
 * and then a second, tested one in the SAME test - if anything between them
 * did a hard navigation, the sibling saved into the mock's in-memory
 * "database" would vanish before the second integration's
 * getIntegrationDiscoveryInformation call ever sees it.
 */
export async function goHomeWithoutReload(page: Page) {
  // exact:true - a substring match against "Integraatiot" also matches the
  // integration view page's own "Integraatiotiedot" tab.
  await page.getByRole("tab", { name: "Integraatiot", exact: true }).click();
  await expect(page).toHaveURL("/");
}

/**
 * Opens "Luo uusi integraatio" from whatever page you're already on (no
 * navigation), waits for the organisaatio/integraatio auto-select to resolve
 * to "Koulutustoimija" (NewIntegrationSelection.tsx auto-flips `integraatio`
 * to 'idp' once the org resolves as a APP_MPASSID_TALLENTAJA_* org -
 * NewIntegrationSelection.tsx:174-180), picks the given idp `tyyppi` type,
 * and clicks "Luo". `typeLabel` must match the exact tyyppi.<type>
 * translation in lang/fi-FI.json (e.g. "Opinsys", "Azure", "ADFS",
 * "Google: Gsuite", "Wilma"). See createNewIdpIntegration() for the
 * goto("/")-prefixed variant used by every single-integration-per-test spec.
 */
export async function createNewIdpIntegrationHere(page: Page, typeLabel: string) {
  await page.getByLabel("lisää").click();

  const dialog = page.getByRole("dialog", { name: "Luo uusi integraatio" });
  await expect(dialog).toBeVisible();

  await expect(
    page.getByRole("combobox", { name: "integraatio:" })
  ).toHaveText(/Koulutustoimija/i, { timeout: 15_000 });

  await page.getByRole("combobox", { name: "tyyppi:" }).click();
  await page.getByRole("option", { name: typeLabel, exact: true }).click();

  await dialog.getByRole("button", { name: "Luo" }).click();
}

/**
 * Opens "Luo uusi integraatio", waits for the organisaatio/integraatio
 * auto-select to resolve to "Koulutustoimija" (NewIntegrationSelection.tsx
 * auto-flips `integraatio` to 'idp' once the org resolves as a
 * APP_MPASSID_TALLENTAJA_* org - NewIntegrationSelection.tsx:174-180), picks
 * the given idp `tyyppi` type, and clicks "Luo".
 * `typeLabel` must match the exact tyyppi.<type> translation in
 * lang/fi-FI.json (e.g. "Opinsys", "Azure", "ADFS", "Google: Gsuite").
 */
export async function createNewIdpIntegration(page: Page, typeLabel: string) {
  await page.goto("/");
  await createNewIdpIntegrationHere(page, typeLabel);
}

/**
 * Opens "Luo uusi integraatio" for a service (SP / "Palveluintegraatio")
 * integration. Switches `integraatio` away from its auto-selected
 * "Koulutustoimija" default, picks the given `tyyppi` (SAML/OIDC), and picks
 * "<environment> - uusi" in the `palvelu` select (PossibleServices.tsx:86-94
 * - a brand-new service in that environment, not tied to any existing mock
 * "set"). The "Luo" button stays disabled until a service is picked
 * (NewIntegrationSelection.tsx:349-350).
 *
 * Unlike idp integrations (selectEnvironment() picks Palveluympäristö on the
 * edit form itself, any time after creation), SP integrations have NO
 * editable environment control post-creation - ServiceProvider.tsx:66-79
 * only ever *displays* deploymentPhase as text. The environment for an SP
 * integration is fixed at creation time by which "palvelu" option you pick
 * here (PossibleServices.tsx:28-35: value -2 -> environment 0/Testi, value
 * -1 -> environment 1/Tuotanto), which is why this is a parameter here
 * instead of a separate helper call after createNewSpIntegration() returns.
 */
export async function createNewSpIntegration(
  page: Page,
  typeLabel: string,
  environment: "Testi" | "Tuotanto" = "Testi"
) {
  await page.goto("/");
  await createNewSpIntegrationHere(page, typeLabel, environment);
}

/**
 * Same as createNewSpIntegration(), but from wherever the page already is
 * (no page.goto("/")) - needed whenever a second integration must be
 * created in the same test without wiping the first one from the mock's
 * in-memory allIntegrations (see createNewIdpIntegrationHere()'s doc
 * comment for the identical idp-side reasoning).
 */
export async function createNewSpIntegrationHere(
  page: Page,
  typeLabel: string,
  environment: "Testi" | "Tuotanto" = "Testi"
) {
  await page.getByLabel("lisää").click();

  const dialog = page.getByRole("dialog", { name: "Luo uusi integraatio" });
  await expect(dialog).toBeVisible();

  await expect(
    page.getByRole("combobox", { name: "integraatio:" })
  ).toHaveText(/Koulutustoimija/i, { timeout: 15_000 });

  await page.getByRole("combobox", { name: "integraatio:" }).click();
  await page.getByRole("option", { name: "Palveluintegraatio" }).click();

  await page.getByRole("combobox", { name: "tyyppi:" }).click();
  await page.getByRole("option", { name: typeLabel, exact: true }).click();

  await page.getByRole("combobox", { name: "palvelu:" }).click();
  await page.getByRole("option", { name: `${environment} - uusi` }).click();

  await dialog.getByRole("button", { name: "Luo" }).click();
}

/**
 * Fills the "Oppilaitoksen valintanäkymän tiedot" section that's common to
 * ALL idp types (IntegrationDetails.tsx:542 gates it on
 * `role==='idp' && typesOKJ.includes(type)`, not on the specific type): picks
 * the koodisto-overridden institution type, uploads a logo (mandatory for
 * every new idp - IntegrationDetails.tsx:301-304 only skips this for
 * role==='sp'), and fills customDisplayName (flips discoveryInformation out
 * of "unchanged" so canSaveDiscoveryInformation becomes true,
 * IntegrationDetails.tsx:386-401).
 */
export async function fillCommonIdpSteps(page: Page, displayName: string) {
  const institutionTypesLabel = page.getByText("Oppilaitostyypit", {
    exact: true,
  });
  const institutionTypesRow = institutionTypesLabel.locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-container ")][1]'
  );
  await institutionTypesRow.getByRole("combobox").click();
  await page.getByRole("option", { name: /Peruskoulut/i }).click();
  await page.keyboard.press("Escape");

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

  await page.getByPlaceholder("Lisää OKJ:n näyttönimi").fill(displayName);
}

// ---------------------------------------------------------------------------
// school-selection.spec.ts helpers - "Oppilaitoksen valintanäkymän tiedot"
// (SchoolSelection.tsx). Unlike fieldRow() below (ancestor-container search,
// safe for Form/index.tsx's per-field nested containers), SchoolSelection.tsx
// renders "Oppilaitostyypit", the "Lisää kouluvalinta säännöt" switch,
// "schools" and "excludedSchools" all as flat sibling <Grid item> pairs under
// ONE shared <Grid container> (SchoolSelection.tsx:1004-1116) - once more than
// one of them has a combobox on screen at the same time (e.g. after picking
// an institutionType, "Oppilaitostyypit" and "schools"/"excludedSchools" all
// coexist), fieldRow()'s ancestor-container walk returns that whole shared
// container and .getByRole("combobox") becomes a strict-mode violation (2+
// matches). Locating the label's immediate next DOM sibling instead pins down
// just that one field's value cell regardless of what else is on the page.
// ---------------------------------------------------------------------------

function siblingRow(page: Page, exactLabelText: string): Locator {
  return page
    .getByText(exactLabelText, { exact: true })
    .locator("xpath=following-sibling::*[1]");
}

/**
 * Sets the idp integration's Palveluympäristö (IdentityProvider.tsx:141-169 -
 * only rendered once `environment.current>-1`, true from mount for both new
 * and existing idp integrations). This must be "Tuotanto" for
 * getIntegrationDiscoveryInformation to ever be called at all -
 * updateExtraSchoolsConfigurationData (SchoolSelection.tsx:571) takes a
 * completely different, network-free branch for any other environment.
 * Reuses fieldRow()'s ancestor-container approach (not siblingRow()) since
 * Koulutustoimija's own container never has more than this one combobox in
 * it, regardless of idp type or institutionTypes chosen.
 */
export async function selectEnvironment(
  page: Page,
  envLabel: "Testi" | "Tuotanto" | "Tuotanto-Testi"
) {
  await fieldRow(page, "Palveluympäristö").getByRole("combobox").click();
  await page.getByRole("option", { name: envLabel, exact: true }).click();
}

/**
 * ADDS one or more institution types on top of whatever is already selected
 * (SchoolSelection.tsx:1010-1020, a `multiple` MultiSelectForm - clicking an
 * ALREADY-checked option toggles it back off, so this must never be called
 * with a label that's already selected). `fillCommonIdpSteps()` always picks
 * "Peruskoulut" itself - for m-series/multi-type scenarios, call this
 * AFTERWARDS with only the *additional* label(s) (e.g. just "Lukiot (15)"),
 * never re-passing "Peruskoulut (11)". `typeLabels` must match the koodisto
 * label exactly as built by SchoolSelection.tsx:191-198
 * (`getKoodistoValue(...) + ' (' + koodiArvo + ')'`).
 */
export async function selectInstitutionTypes(page: Page, typeLabels: string[]) {
  await siblingRow(page, "Oppilaitostyypit").getByRole("combobox").click();
  for (const label of typeLabels) {
    await page.getByRole("option", { name: label, exact: true }).click();
  }
  await page.keyboard.press("Escape");
}

/**
 * Toggles "Lisää kouluvalinta säännöt" (SchoolSelection.tsx:1046-1051,
 * DataRowTitle path="extraSchoolsConfiguration" - see lang/fi-FI.json's
 * "attribuutti.extraSchoolsConfiguration"). Needed before selectSchools()/
 * selectExcludedSchools() ONLY when nothing forces it on automatically -
 * mandatoryExtraSchoolsConfiguration() (SchoolSelection.tsx:377-397) only
 * auto-enables it once a matching sibling integration already exists, so the
 * very FIRST ("sibling") integration created for an institutionType/org
 * combination must flip this switch on by hand to reveal those fields at
 * all - a later integration that sees that sibling via
 * getIntegrationDiscoveryInformation does not need this, the switch is
 * already on (and disabled) for it.
 */
export async function toggleExtraSchoolsConfiguration(page: Page) {
  // Unlike "Oppilaitostyypit"/"schools"/"excludedSchools" (a bare
  // FormattedMessage text node directly inside the label's <Grid item>),
  // this label goes through DataRowTitle (SchoolSelection.tsx:1046,
  // 1261-1291), which wraps it in a Tooltip+<span> - siblingRow()'s
  // following-sibling::*[1] would look for a sibling of that inner <span>
  // (there isn't one) instead of the label's own <Grid item>, so walk up to
  // the nearest MuiGrid-item first.
  await page
    .getByText("Lisää kouluvalinta säännöt", { exact: true })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-item ")][1]/following-sibling::*[1]'
    )
    .getByRole("checkbox")
    .click();
}

/**
 * Picks schools to explicitly INCLUDE (SchoolSelection.tsx:1055-1076, label
 * literally "schools" - not translated, see lang/fi-FI.json's "4H4eju" -
 * only rendered while excludedSchools is still empty). No-op for an empty
 * list: the field may not even be mandatory/visible depending on the
 * scenario, and every s/m-series scenario that needs zero inclusions should
 * just leave it untouched rather than asserting a specific rendered state.
 */
export async function selectSchools(page: Page, schoolNames: string[]) {
  if (schoolNames.length === 0) return;
  await siblingRow(page, "schools").getByRole("combobox").click();
  for (const name of schoolNames) {
    await page.getByRole("option", { name, exact: true }).click();
  }
  await page.keyboard.press("Escape");
}

/**
 * Picks schools to explicitly EXCLUDE (SchoolSelection.tsx:1077-1098, label
 * literally "excludedSchools" - see lang/fi-FI.json's "K4qtsT" - only
 * rendered while schools is still empty). See selectSchools() for why an
 * empty list is a no-op rather than an assertion.
 */
export async function selectExcludedSchools(page: Page, schoolNames: string[]) {
  if (schoolNames.length === 0) return;
  await siblingRow(page, "excludedSchools").getByRole("combobox").click();
  for (const name of schoolNames) {
    await page.getByRole("option", { name, exact: true }).click();
  }
  await page.keyboard.press("Escape");
}

/**
 * Reads every option label currently rendered in the "schools"/
 * "excludedSchools" MultiSelectForm's dropdown (its `enums` prop -
 * SchoolSelection.tsx:1074-1105) - used to assert the field offers *exactly*
 * the eSI/eSE-restricted set of schools, not just that one particular pick
 * happens to work. When `enums` is empty, MultiSelectForm renders a single
 * disabled "Ei valintoja" placeholder (MultiSelectForm.tsx:126-132) instead
 * of any real school - filtered out here so callers can compare against an
 * empty array regardless of whether that placeholder counts as an "option"
 * role in a given MUI version. Leaves the dropdown closed again afterwards.
 */
export async function getMultiSelectOptions(
  page: Page,
  fieldLabel: string
): Promise<string[]> {
  await siblingRow(page, fieldLabel).getByRole("combobox").click();
  const options = await page.getByRole("option").allTextContents();
  await page.keyboard.press("Escape");
  return options.filter((o) => o !== "Ei valintoja");
}

/**
 * Creates and saves a background ("sibling") idp integration in Tuotanto so
 * that a later integration sharing an institutionType with it gets a
 * non-null existingIncluded/existingExcluded from
 * getIntegrationDiscoveryInformation (requestLogicHandlers.ts's
 * getIntegrationDiscoveryInformationValue aggregates schools/excludedSchools
 * across all *other*, active, Tuotanto idp integrations of the same
 * organization that share at least one institutionType - it is not a static
 * mock response, so the only way to produce a given existingIncluded/
 * existingExcluded pair is to have really created+saved a matching sibling
 * first). Uses Wilma (simplest idp: one hostname text field, no
 * metadataUrl/file). Leaves the browser back on "/" when done.
 */
const PERUSKOULUT_LABEL = "Peruskoulut (11)";

export async function createSiblingIdpIntegration(
  page: Page,
  options: {
    institutionTypeLabels: string[];
    schools?: string[];
    excludedSchools?: string[];
    // A schools+excludedSchools *combination* (e.g. eSI=[B], eSE=[A,D]) can't
    // come from one sibling - SchoolSelection.tsx only ever shows ONE of the
    // two fields at a time (each one's render condition checks the OTHER is
    // empty), so it takes two separate siblings whose contributions the mock
    // then unions together. Pass alreadyHome:true for every
    // createSiblingIdpIntegration() call after the first one in a test -
    // otherwise this reaches for createNewIdpIntegration()'s goto("/")
    // internally, which would wipe the *previous* sibling(s) just like
    // calling it directly would (see goHomeWithoutReload()'s doc comment).
    alreadyHome?: boolean;
  }
) {
  if (options.alreadyHome) {
    await createNewIdpIntegrationHere(page, "Wilma");
  } else {
    await createNewIdpIntegration(page, "Wilma");
  }
  await fillWilmaFields(page, "sibling.inschool.fi");
  await selectEnvironment(page, "Tuotanto");
  // fillCommonIdpSteps() below always selects "Peruskoulut (11)" itself -
  // only ADD whatever else was asked for (see selectInstitutionTypes()'s
  // doc comment for why re-selecting it here would toggle it back off).
  const additionalTypeLabels = options.institutionTypeLabels.filter(
    (label) => label !== PERUSKOULUT_LABEL
  );
  await fillCommonIdpSteps(page, "Sibling-koulu");
  if (additionalTypeLabels.length > 0) {
    await selectInstitutionTypes(page, additionalTypeLabels);
  }
  const schools = options.schools || [];
  const excludedSchools = options.excludedSchools || [];
  if (schools.length > 0 || excludedSchools.length > 0) {
    // Only toggle manually when this is the *first* matching sibling
    // (alreadyHome:false, the common case): with no prior sibling,
    // mandatoryExtraSchoolConfiguration() (SchoolSelection.tsx:377-397)
    // leaves the switch off, so toggleExtraSchoolsConfiguration() has to turn
    // it on by hand - see that function's doc comment. When alreadyHome is
    // true (a *second* sibling created in the same test, e.g. one supplying
    // schools and another supplying excludedSchools for s6/s7/m6/m7), the
    // first sibling now shows up as eSI/eSE!==null for this one too, so
    // mandatoryExtraSchoolConfiguration() already auto-enabled AND disabled
    // the switch (disableExtraSchoolConfigurationSwitch.current=true) before
    // we get here - clicking it would just time out against a disabled
    // checkbox.
    if (!options.alreadyHome) {
      await toggleExtraSchoolsConfiguration(page);
    }
    await selectSchools(page, schools);
    await selectExcludedSchools(page, excludedSchools);
  }
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  // goHomeWithoutReload(), NOT page.goto("/") - see its doc comment: a hard
  // reload here would wipe this sibling from the mock's in-memory
  // allIntegrations before the *next* integration created in this test can
  // see it via getIntegrationDiscoveryInformation.
  await goHomeWithoutReload(page);
}

/** Locates the labelled Grid row for a `attribuutti.<name>`/config field the
 * same way create-wilma-integration.spec.ts locates "Oppilaitostyypit" -
 * finds the visible label text, then walks up to the nearest MUI Grid
 * container that also holds the field's input/button. Needed for fields
 * whose add-button ("Lisää") isn't unique on the page (e.g. SAML has one
 * per array field: assertionConsumerServiceUrls, signingCertificates,
 * encryptionCertificates - Form/index.tsx:457-470,485-498). */
export function fieldRow(page: Page, exactLabelText: string): Locator {
  return page
    .getByText(exactLabelText, { exact: true })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-container ")][1]'
    );
}

/**
 * Locates a home/IntegrationSelection table's header cell by its label text
 * (e.g. "Tyyppi", "Rooli", "Ympäristö") - needed to scope the column's
 * filter-menu kebab button, since `TableHeaderCellWithMenu.tsx`'s
 * `getStringChild()` can't extract a string out of a bare
 * `<FormattedMessage defaultMessage="Tyyppi" />` child, so every column's
 * kebab button ends up with the SAME accessible name ("valikko sarakkeelle: "
 * with nothing appended) - a bare `getByRole("button", {name: "valikko
 * sarakkeelle: ..."})` can't tell them apart. Scoping to the header cell
 * containing the column's own label text first disambiguates them.
 */
export function columnHeaderCell(page: Page, exactLabelText: string): Locator {
  return page
    .getByText(exactLabelText, { exact: true })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiTableCell-root ")][1]'
    );
}

/**
 * Simulates dropping a text file onto a native HTML5 drag-and-drop zone.
 * `src/routes/integraationMuokkaus/Form/DragAndDropForm.tsx` has no
 * `<input type=file>` at all (DragAndDropForm.tsx:70-97) - it's a bare
 * `<div>` that only reacts to `onDrop`, so Playwright's `setInputFiles`
 * cannot be used here. This dispatches a synthetic `drop` DragEvent with a
 * real `DataTransfer`/`File`, which is what `handleDrop`
 * (DragAndDropForm.tsx:31-44) reads via `event.dataTransfer.files`.
 */
export async function dropTextFile(
  page: Page,
  target: Locator,
  fileName: string,
  mimeType: string,
  content: string
) {
  const dataTransfer = await page.evaluateHandle(
    ({ fileName, mimeType, content }) => {
      const dt = new DataTransfer();
      const file = new File([content], fileName, { type: mimeType });
      dt.items.add(file);
      return dt;
    },
    { fileName, mimeType, content }
  );
  await target.dispatchEvent("drop", { dataTransfer });
}

/**
 * Clicks "Tallenna" and works through the two dialogs that follow it, both
 * of which use an "OK"-labelled button but are never open at the same time
 * (integraationMuokkaus/index.tsx):
 *  1. A confirmation dialog ("Haluatko varmasti tallentaa?", index.tsx:309-
 *     337) - its OK actually performs the save (the POST request).
 *  2. Only once that succeeds, a second dialog ("Muutokset tallennettu
 *     onnistuneesti", index.tsx:338-366) appears - ITS OK is what calls
 *     closeNotice() (index.tsx:85-97), which navigates to
 *     `/integraatio/<id>`. Clicking "OK" only once (as an earlier version of
 *     this helper did) performs the save but leaves the success dialog open
 *     and the URL unchanged - harmless for a spec that never asserts
 *     navigation, but breaks any edit-flow spec that needs to reach the view
 *     page afterward.
 */
export async function saveIntegration(page: Page) {
  const saveButton = page.getByRole("button", { name: "Tallenna" });
  await expect(saveButton).toBeEnabled({ timeout: 15_000 });
  await saveButton.click();

  const okButton = page.getByRole("button", { name: "OK" });
  await okButton.click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });

  await okButton.click();
}

/**
 * From an integration's view page (`/integraatio/:id`, landed on after
 * saveIntegration()'s "OK" click), opens the edit form. The Edit FAB
 * (EditIntegrationButton.tsx:32-48) uses the exact same aria-label ("lisää")
 * as the home page's "add new integration" FAB, but it's the only element
 * with that label on this page, so it's unambiguous here. It navigates via
 * `<Link state={props.integration}>` to `/muokkaa/<role>/<type>/<id>` with
 * the real, already-saved integration as `location.state`
 * (EditIntegrationButton.tsx:18-27,34-36) - unlike a fresh
 * `page.goto('/muokkaa/...')`, which would NOT work here since
 * IntegrationDetails.tsx:56-57 reads the integration unconditionally from
 * `useLocation().state`, with no id-based fallback fetch.
 */
export async function openEditFromViewPage(page: Page) {
  await page.getByLabel("lisää").click();
}

/**
 * Deletes (inactivates) the integration currently open in edit mode
 * (integraationMuokkaus/index.tsx:266-275,281-337). Clicking the "poista"
 * IconButton flips `isDisabled` to true, which re-labels the Snackbar's save
 * button from "Tallenna" to "Poista" and swaps the confirmation dialog's
 * text ("Olet poistamassa integraation tietoja"/"Haluatko varmasti
 * poistaa?") - but it's still the exact same `saveIntegration()`
 * click-handler/dialog chain as a normal save (isDisabled just makes it call
 * `inactivateIntegration({id})` instead of create/update, index.tsx:141-142),
 * including the same "Muutokset tallennettu onnistuneesti" success dialog.
 * Its "OK" navigates to "/" instead of `/integraatio/:id` (closeNotice(),
 * index.tsx:85-97).
 */
export async function deleteIntegration(page: Page) {
  await page.getByLabel("poista", { exact: true }).click();

  const deleteButton = page.getByRole("button", { name: "Poista", exact: true });
  await deleteButton.click();

  const confirmDialogOk = page.getByRole("button", { name: "OK" });
  await confirmDialogOk.click();

  await expect(
    page.getByText("Muutokset tallennettu onnistuneesti")
  ).toBeVisible({ timeout: 15_000 });

  await confirmDialogOk.click();
}

// ---------------------------------------------------------------------------
// Per-type field fillers, shared between the create-*.spec.ts files and the
// muokkaa-*.spec.ts (edit) files, so both exercise identically-shaped data.
// ---------------------------------------------------------------------------

export async function fillWilmaFields(page: Page, hostname: string) {
  await page.getByPlaceholder("Lisää hostname").fill(hostname);
}

export async function fillOpinsysFields(
  page: Page,
  clientKey = "test-opinsys-client-key"
) {
  // clientId: validation ['binddn'] (Validators.tsx validateDn) - needs at
  // least one DC=/dc= component; "dc=example,dc=fi" satisfies the regex.
  await page
    .getByPlaceholder("Lisää Client ID", { exact: true })
    .fill("dc=example,dc=fi");
  // clientKey/tenantId: no format validation (config.ts:169,233). exact:true
  // is required here even though opinsys itself has no "Client Keyn
  // voimassaolo" field - kept for parity/safety with fillAzureFields, which
  // does share the page with that field and needs the same fix (see there).
  await page
    .getByPlaceholder("Lisää Client Key", { exact: true })
    .fill(clientKey);
  await page
    .getByPlaceholder("Lisää Tenant ID", { exact: true })
    .fill("test-opinsys-tenant-id");
}

export async function fillAdfsFields(
  page: Page,
  metadataUrl = "https://adfs.esimerkki.fi/FederationMetadata/2007-06/FederationMetadata.xml"
) {
  // metadataUrl: no format validation (IdentityProvider.tsx:120 validates
  // against an empty rule list), just needs to be non-empty. exact:true
  // isn't strictly required here (adfs has no other "Lisää metadata url*"
  // field), but kept for consistency after the azure Client Key/Client
  // Keyn voimassaolo substring-match bug (see fillAzureFields).
  await page
    .getByPlaceholder("Lisää metadata url", { exact: true })
    .fill(metadataUrl);
}

export async function fillGsuiteFields(
  page: Page,
  fileName = "metadata.xml"
) {
  // Note: even when editing an existing gsuite integration, this text still
  // shows - the actual `File` object behind a previously-uploaded
  // metadataUrl is never reconstructable client-side (only the resulting
  // URL string is persisted), so DragAndDropForm.tsx's internal `files`
  // state (and thus its "Drag & Drop metadata file" placeholder) starts
  // empty again on every page load, regardless of create vs. edit.
  const dropZone = page.getByText("Drag & Drop metadata file");
  await expect(dropZone).toBeVisible({ timeout: 15_000 });
  await dropTextFile(
    page,
    dropZone,
    fileName,
    "text/xml",
    '<EntityDescriptor entityID="https://accounts.google.com/o/saml2"></EntityDescriptor>'
  );
}

export async function fillAzureFields(page: Page, clientId = "test-azure-client-id") {
  // data fields (config.ts: clientId/clientKey validation:[], tenantId
  // validation:[], azureApplicationIdUri validation:[] - no format checks).
  // exact:true matters here: Playwright's getByPlaceholder does a
  // case-insensitive *substring* match by default, and azure (uniquely
  // among idp types) also renders a `clientKeyValidUntil` field whose
  // placeholder ("Lisää Client Keyn voimassaolo") contains "Lisää Client
  // Key" as a prefix - without exact:true, .fill() on "Lisää Client Key"
  // hits both inputs and throws a strict-mode violation.
  await page.getByPlaceholder("Lisää Client ID", { exact: true }).fill(clientId);
  await page
    .getByPlaceholder("Lisää Client Key", { exact: true })
    .fill("test-azure-client-key");
  await page
    .getByPlaceholder("Lisää Tenant ID", { exact: true })
    .fill("test-azure-tenant-id");
  await page
    .getByPlaceholder("Lisää azureApplicationIdUri", { exact: true })
    .fill("api://mpassid-e2e-test");
  await page
    .getByPlaceholder("Lisää metadata url", { exact: true })
    .fill(
      "https://login.microsoftonline.com/test-azure-tenant-id/federationmetadata/2007-06/federationmetadata.xml"
    );

  // Mandatory user attributes (config.ts, all `type: 'user'`, mandatory for
  // 'azure'): these map an Azure AD claim name to the MPASSid attribute,
  // any non-empty string satisfies validation (no `validation` rules set).
  await page.getByPlaceholder("Lisää Etunimi", { exact: true }).fill("given_name");
  await page.getByPlaceholder("Lisää Sukunimi", { exact: true }).fill("family_name");
  await page
    .getByPlaceholder("Lisää Oppilaitostunnus", { exact: true })
    .fill("school_id");
  await page
    .getByPlaceholder("Lisää Oppijanumero", { exact: true })
    .fill("learner_id");
  await page
    .getByPlaceholder("Lisää Käyttäjän rooli", { exact: true })
    .fill("role");
}

// Palvelun nimi: shared by SAML and OIDC.
export async function fillServiceName(page: Page, name: string) {
  await page
    .getByPlaceholder("Lisää palvelun nimi", { exact: true })
    .fill(name);
}

// See create-saml-integration.spec.ts for provenance/disclaimer: this is the
// base64 body of a throwaway self-signed certificate generated purely to
// satisfy signingCertificates' "is this parseable as an X.509 cert" check
// (Validators.tsx validateCert), not used for anything security-sensitive.
export const TEST_SIGNING_CERT =
  "MIIDFzCCAf+gAwIBAgIUSjO/iUT2Q9GUAo94L0JU6vAKAdowDQYJKoZIhvcNAQELBQAwGzEZMBcGA1UEAwwQbXBhc3NpZC1lMmUtdGVzdDAeFw0yNjA3MTMwODQ5MjlaFw0zNjA3MTAwODQ5MjlaMBsxGTAXBgNVBAMMEG1wYXNzaWQtZTJlLXRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCgi76hkLU8YEJGbg1uqnhwiOCUTceZOLkhJe1SCb+WbXwc03SnmGLfmzfFVblhwGHmwrwRP6AFqeJqpJs4tnSr3FdbeSrNq5TgcJF2+J/6DKX8c9q4HShmfLzmyjUXL/kQh3w4If4V5lAxWch0YNP/tiodkdFyN4XUtzqV7V4rHlmA1jJ97Ek/fBTJ9O9pAG//xROMLf8/HkpTQuggYOscwuK4iXWr1Cqgjg4QBk6H5D0nLFq3kE70cThUf7gO/zqi7TqTsVRYTxSAMqBVDFOQhYQCUSTIrxFDy2PARtiuQV2w1lkvANxLgEf5A6LgdrMhEKj4Vdjy3IFVlUXZaO4JAgMBAAGjUzBRMB0GA1UdDgQWBBTcupUfhuQesM9qiMH1QK5u/wI80jAfBgNVHSMEGDAWgBTcupUfhuQesM9qiMH1QK5u/wI80jAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAedR2xXYwNOLO3kdq/KPnfcrQRJew93xv3ORdgTjpkEy0H08JoNUfaTtwCQ72+t9vKNyFIBrPF6u0lKNcQrc+QJ1U5cvJfUiNnSUtcqhA1kHqlufsk3x7ijgTineoUy6Z/ZN172K0D1JNZl45CPfWzbzog1A+lrLoPVsdcAxkIvBsYe6A2ELrSWEghAxC7NnFyeF/C02qCcs7xluCDDeptw0IXFLRc37UNrZEfEOYCxEWNFVw3Ic8zY6c8zt7ACNM5hWsjfcM/srzdKT5xzTBnt7tLend4PuWPVOEJOEj1cMMCyFvsS4jxIhrTOXvDKT9rwWZ+Aji/0Mfr4NlkfltZ";

/**
 * Fills the SAML "Palvelun metadata tiedot" section's mandatory fields:
 * entityId (plain text), assertionConsumerServiceUrls (nested object array -
 * fill "location" then click that row's own "Lisää" button), and
 * signingCertificates (a plain array field - fill then press Enter). See
 * create-saml-integration.spec.ts for full citations.
 */
export async function fillSamlMetadata(
  page: Page,
  entityId = "https://sp.esimerkki.fi/saml/metadata"
) {
  await page.getByPlaceholder("Lisää Entity-ID").fill(entityId);

  const acsRow = fieldRow(page, "assertionConsumerServiceUrls");
  const acsLocation = acsRow.getByPlaceholder("Lisää location");
  // Only add an ACS URL if the list is still empty (edit flow: the
  // integration already has one from creation, ListForm/ObjectForm just
  // display it - no need to add a second one).
  if (await acsLocation.isVisible().catch(() => false)) {
    await acsLocation.fill("https://sp.esimerkki.fi/saml/acs");
    await acsRow.getByRole("button", { name: "Lisää" }).click();
  }

  const signingCertsRow = fieldRow(page, "signingCertificates");
  const signingCertInput = signingCertsRow.getByPlaceholder(
    "Lisää uusi signingCertificates"
  );
  if (await signingCertInput.isVisible().catch(() => false)) {
    await signingCertInput.fill(TEST_SIGNING_CERT);
    await signingCertInput.press("Enter");
  }
}

/**
 * Fills OIDC's one mandatory metadata field that never self-populates:
 * redirect_uris. See create-oidc-integration.spec.ts for why every other
 * OIDC metadata field is skipped.
 */
export async function fillOidcMetadata(
  page: Page,
  redirectUri = "https://sp.esimerkki.fi/oidc/callback"
) {
  const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
  await redirectUriInput.fill(redirectUri);
  await redirectUriInput.press("Enter");
}
