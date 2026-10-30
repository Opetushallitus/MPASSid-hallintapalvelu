import { type Page } from "@playwright/test";
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

// Integraatiovalinnat-välilehti (palvelusallinta) -
// IntegrationSelection/index.tsx.
//
// The candidate table lists only role "set" integrations in production
// (useIntegrationsSpecSearchPageable() sets rooli=set and ympäristö=1 on
// /integraatio/:id), and nothing in the UI creates one. The tests at the end
// ("yksittäiset palvelut") therefore seed set integrations into the mock
// database before the app loads (sessionStorage "mpassid-mock-integrations",
// see src/mocks/requestLogicHandlers.ts); the first tests need no
// candidates.
//
// Rules (IntegrationSelection/index.tsx, IntegrationTab/index.tsx):
// - A new idp integration has permissions [] and "Salli kaikki palvelut" on
//   (no permissions, or only the test service, means all allowed).
// - "Salli kaikki palvelut" on sets permissions to the test service only;
//   off restores the saved permissions.
// - Save is possible when a service other than the test service is allowed,
//   or all services are allowed (cannotSave()).
// - Saving "allow all" over individually allowed services asks for a
//   confirmation ("Olet sallimassa kaikki palvelut"): the backend stores
//   allow all as an empty list, so the individual services are removed.
// - The save bar shows while no dialog is open and the selection differs
//   from the saved one, or no service is chosen without "allow all".

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
  // permissions [] with "allow all" on can be saved, so the warning does not
  // show in the default state (only after turning "allow all" off - see the
  // next test).
  await expect(
    page.getByText(
      "Tallentaaksesi valinnat sinun pitää sallia vähintään yksi tai useampi palvelu"
    )
  ).not.toBeVisible();
  // Nothing differs from the saved selection, so there is no save bar.
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

  // "Allow all" off with no service chosen shows the save bar even though
  // the permissions did not change, to surface the "must allow" warning.
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

  // "Poista valinnat" (aria-label "poista") sets permissions to the test
  // service only. The selection now differs from the saved [] and "allow
  // all" is still on, so the save bar shows with Tallenna enabled.
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

// ---------------------------------------------------------------------------
// Individual services: seeded set integrations (see the header comment).
// ---------------------------------------------------------------------------

const MOCK_DATABASE_KEY = "mpassid-mock-integrations";
// config.ts mpassIdUserAttributeTestService: always allowed, cannot be toggled.
const TEST_SERVICE_ID = 3000001;
// The mock user (käyttöoikeus.json) may only view this organization's
// integrations (KATSELIJA, no TALLENTAJA group).
const VIEW_ONLY_ORGANIZATION_OID = "1.2.246.562.10.00000000001";

const service = (id: number, name: string) => ({
  id,
  deploymentPhase: 1,
  active: true,
  organization: { oid: "1.2.246.562.10.00000000099", name: "Palveluorganisaatio" },
  configurationEntity: { set: { type: "set", name } },
  permissions: [],
});

const SERVICES = [
  service(TEST_SERVICE_ID, "MPASSid testipalvelu"),
  service(7000001, "Palvelu A"),
  service(7000002, "Palvelu B"),
];

/** The set integrations, in the mock database before the app first loads. */
async function seedServices(page: Page) {
  await page.addInitScript(
    ({ key, services }) => {
      // Only on the first load: later loads keep what the test has saved.
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, JSON.stringify(services));
      }
    },
    { key: MOCK_DATABASE_KEY, services: SERVICES }
  );
}

/** A saved Wilma integration's Integraatiovalinnat tab; returns its id. */
async function openSelectionOfNewIntegration(page: Page, name: string) {
  await mockInstitutionTypes(page);
  await seedServices(page);
  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, `${name}.inschool.fi`);
  await fillCommonIdpSteps(page, `${name}-koulu`);
  await saveIntegration(page);
  await expect(page).toHaveURL(/\/integraatio\/\d+/);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await page.getByRole("tab", { name: "Integraatiovalinnat" }).click();
  await expect(serviceSwitch(page, "Palvelu A")).toBeVisible();
  return id;
}

/** Opens the integration again with a full page load (no navigation state). */
async function reopenSelection(page: Page, id: string) {
  await page.goto("/");
  await page.goto(`/integraatio/${id}`);
  await page.getByRole("tab", { name: "Integraatiovalinnat" }).click();
  await expect(serviceSwitch(page, "Palvelu A")).toBeVisible();
}

const allowAll = (page: Page) => page.getByRole("checkbox", { name: "Salli kaikki palvelut" });
const serviceSwitch = (page: Page, name: string) =>
  page.getByRole("row").filter({ hasText: name }).getByRole("checkbox");
const saveBar = (page: Page) => page.getByText("Tallenna muutokset");
const saveButton = (page: Page) => page.getByRole("button", { name: "Tallenna", exact: true });
const confirmationDialog = (page: Page) =>
  page.getByRole("dialog").filter({ hasText: "Olet sallimassa kaikki palvelut" });
const mustAllowWarning = (page: Page) =>
  page.getByText("Tallentaaksesi valinnat sinun pitää sallia vähintään yksi tai useampi palvelu");

async function saveSelection(page: Page) {
  await expect(saveButton(page)).toBeEnabled();
  await saveButton(page).click();
  await expect(page.getByText("Muutokset tallennettu onnistuneesti")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "OK" }).click();
}

/** Allows exactly the given services (from the default "allow all") and saves. */
async function allowOnly(page: Page, names: string[]) {
  await allowAll(page).click();
  await names.reduce(
    (previous, name) => previous.then(() => serviceSwitch(page, name).click()),
    Promise.resolve()
  );
  await saveSelection(page);
}

test.describe("Integraatiovalinnat: yksittäiset palvelut", () => {
  test("kaikki sallittu: palvelut näkyvät sallittuina, eikä niitä voi kytkeä", async ({ page }) => {
    await openSelectionOfNewIntegration(page, "valinnat-kaikki");

    await expect(allowAll(page)).toBeChecked();
    await expect(serviceSwitch(page, "Palvelu A")).toBeChecked();
    await expect(serviceSwitch(page, "Palvelu A")).toBeDisabled();
    await expect(serviceSwitch(page, "Palvelu B")).toBeChecked();
    await expect(serviceSwitch(page, "Palvelu B")).toBeDisabled();
  });

  test("testipalvelu on aina sallittu, eikä sitä voi kytkeä", async ({ page }) => {
    await openSelectionOfNewIntegration(page, "valinnat-testipalvelu");
    await allowAll(page).click();

    await expect(serviceSwitch(page, "Palvelu A")).not.toBeChecked();
    await expect(serviceSwitch(page, "Palvelu A")).toBeEnabled();
    await expect(serviceSwitch(page, "MPASSid testipalvelu")).toBeChecked();
    await expect(serviceSwitch(page, "MPASSid testipalvelu")).toBeDisabled();
  });

  test("yksittäisen palvelun salliminen tallentuu", async ({ page }) => {
    const id = await openSelectionOfNewIntegration(page, "valinnat-yksi");

    await allowAll(page).click();
    await expect(mustAllowWarning(page)).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();

    await serviceSwitch(page, "Palvelu A").click();
    await expect(serviceSwitch(page, "Palvelu A")).toBeChecked();
    await expect(mustAllowWarning(page)).not.toBeVisible();
    await saveSelection(page);

    await reopenSelection(page, id);
    await expect(allowAll(page)).not.toBeChecked();
    await expect(serviceSwitch(page, "Palvelu A")).toBeChecked();
    await expect(serviceSwitch(page, "Palvelu B")).not.toBeChecked();
    await expect(serviceSwitch(page, "MPASSid testipalvelu")).toBeChecked();
    await expect(saveBar(page)).not.toBeVisible();
  });

  test("sallitun palvelun poisto ja toisen salliminen tallentuvat", async ({ page }) => {
    const id = await openSelectionOfNewIntegration(page, "valinnat-vaihto");
    await allowOnly(page, ["Palvelu A"]);

    await serviceSwitch(page, "Palvelu A").click();
    await serviceSwitch(page, "Palvelu B").click();
    await saveSelection(page);

    await reopenSelection(page, id);
    await expect(serviceSwitch(page, "Palvelu A")).not.toBeChecked();
    await expect(serviceSwitch(page, "Palvelu B")).toBeChecked();
  });

  test("'Salli kaikki palvelut' yksittäisten valintojen jälkeen: vahvistus ja tallennus", async ({ page }) => {
    const id = await openSelectionOfNewIntegration(page, "valinnat-takaisin-kaikki");
    await allowOnly(page, ["Palvelu A", "Palvelu B"]);

    await allowAll(page).click();
    await expect(serviceSwitch(page, "Palvelu A")).toBeDisabled();
    await saveButton(page).click();
    const confirmation = confirmationDialog(page);
    await expect(confirmation).toBeVisible();
    await expect(
      confirmation.getByText("Haluatko varmasti tallentaa? Tieto yksittäisistä valinnoista poistuu tallennuksen yhteydessä.")
    ).toBeVisible();
    await confirmation.getByRole("button", { name: "OK" }).click();
    await expect(page.getByText("Muutokset tallennettu onnistuneesti")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "OK" }).click();

    await reopenSelection(page, id);
    await expect(allowAll(page)).toBeChecked();
    await expect(serviceSwitch(page, "Palvelu B")).toBeChecked();
    await expect(serviceSwitch(page, "Palvelu B")).toBeDisabled();
  });

  test("'Salli kaikki palvelut' -vahvistuksen PERUUTA ei tallenna", async ({ page }) => {
    const id = await openSelectionOfNewIntegration(page, "valinnat-vahvistus-peruuta");
    await allowOnly(page, ["Palvelu A"]);

    await allowAll(page).click();
    await saveButton(page).click();
    await confirmationDialog(page).getByRole("button", { name: "PERUUTA" }).click();

    await expect(confirmationDialog(page)).not.toBeVisible();
    await expect(saveBar(page)).toBeVisible();
    await expect(allowAll(page)).toBeChecked();

    await reopenSelection(page, id);
    await expect(allowAll(page)).not.toBeChecked();
    await expect(serviceSwitch(page, "Palvelu A")).toBeChecked();
  });

  test("'Poista valinnat' poistaa yksittäiset valinnat, ja tallennus vaatii uuden valinnan", async ({
    page,
  }) => {
    await openSelectionOfNewIntegration(page, "valinnat-poista");
    await allowOnly(page, ["Palvelu A", "Palvelu B"]);

    await page.getByLabel("poista", { exact: true }).click();

    await expect(serviceSwitch(page, "Palvelu A")).not.toBeChecked();
    await expect(serviceSwitch(page, "Palvelu B")).not.toBeChecked();
    await expect(serviceSwitch(page, "MPASSid testipalvelu")).toBeChecked();
    await expect(mustAllowWarning(page)).toBeVisible();
    await expect(saveBar(page)).toBeVisible();
    await expect(saveButton(page)).toBeDisabled();
  });

  test("'Peruuta' palauttaa tallennetut yksittäiset valinnat", async ({ page }) => {
    await openSelectionOfNewIntegration(page, "valinnat-peruuta");
    await allowOnly(page, ["Palvelu A"]);

    await serviceSwitch(page, "Palvelu A").click();
    await serviceSwitch(page, "Palvelu B").click();
    await expect(saveBar(page)).toBeVisible();

    await page.getByRole("button", { name: "Peruuta", exact: true }).click();

    await expect(saveBar(page)).not.toBeVisible();
    await expect(allowAll(page)).not.toBeChecked();
    await expect(serviceSwitch(page, "Palvelu A")).toBeChecked();
    await expect(serviceSwitch(page, "Palvelu B")).not.toBeChecked();
  });

  test("ilman tallennusoikeutta valintoja ei voi muuttaa", async ({ page }) => {
    const id = await openSelectionOfNewIntegration(page, "valinnat-ei-oikeuksia");

    // The integration moves to an organization the user may only view.
    await page.evaluate(
      ({ key, integrationId, oid }) => {
        const integrations = JSON.parse(window.sessionStorage.getItem(key)!);
        const integration = integrations.find((row: { id: number }) => row.id === integrationId);
        integration.organization = { ...integration.organization, oid };
        window.sessionStorage.setItem(key, JSON.stringify(integrations));
      },
      { key: MOCK_DATABASE_KEY, integrationId: Number(id), oid: VIEW_ONLY_ORGANIZATION_OID }
    );
    await reopenSelection(page, id);

    await expect(page.getByText("Ei oikeuksia muuttaa sallittuja palveluja")).toBeVisible();
    await allowAll(page).click();
    await expect(allowAll(page)).toBeChecked();
    await expect(serviceSwitch(page, "Palvelu A")).toBeDisabled();
    await expect(saveBar(page)).not.toBeVisible();
  });
});
