import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  createNewSpIntegration,
  fieldRow,
  fillAdfsFields,
  fillCommonIdpSteps,
  fillWilmaFields,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
  selectEnvironment,
} from "./helpers";

// New kinds of dataConfiguration items (config.ts UiConfiguration) on the
// edit form. The items are given to the app through localStorage
// (src/routes/integraationMuokkaus/devUiConfiguration.ts, development only):
// they are appended to config.ts' list, which the edit page passes to
// Attributes (data/user) and Metadata (sp). Each item has its own "e2e…"
// name, so it never collides with a config.ts item. Item names have no
// translation, so the name itself is the label ("Lisää <name>" placeholder,
// view page row label).

interface IntegrationTypeConfig {
  name: string;
  editable: boolean;
  visible: boolean;
  defaultValue?: string;
}

interface Item {
  name: string;
  type: "data" | "user" | "metadata";
  mandatory: boolean;
  array: boolean;
  switch: boolean;
  validation: string[];
  integrationType: IntegrationTypeConfig[];
  enum?: string[];
  environment?: number;
}

const DEV_UI_CONFIGURATION_KEY = "e2e-ui-configuration";

const editableFor = (name: string): IntegrationTypeConfig => ({ name, editable: true, visible: true });

const item = (name: string, overrides: Partial<Item> = {}): Item => ({
  name,
  type: "data",
  mandatory: false,
  array: false,
  switch: false,
  validation: [],
  integrationType: [editableFor("wilma")],
  ...overrides,
});

/** Gives the app the extra items before any of its scripts run (every navigation). */
async function useExtraItems(page: Page, items: Item[]) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [DEV_UI_CONFIGURATION_KEY, JSON.stringify(items)] as const
  );
}

/**
 * Value cell of a row on the integration VIEW page (same walk as
 * school-selection-extra.spec.ts): the label's grid cell, then the next one.
 */
function viewRowValue(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-root ")][1]/following-sibling::*[1]'
    );
}

const saveButton = (page: Page) => page.getByRole("button", { name: "Tallenna" });

/** A new Wilma integration with everything else filled in (Tuotanto). */
async function newWilma(page: Page, name: string) {
  await mockInstitutionTypes(page);
  await createNewIdpIntegration(page, "Wilma");
  await fillWilmaFields(page, `${name}.inschool.fi`);
  await fillCommonIdpSteps(page, `${name}-koulu`);
}

test.describe("uudet dataConfiguration-kohteet: Wilma (data)", () => {
  test("vapaaehtoinen tekstikenttä näkyy, tallentuu ja on muokkauksessa esitäytetty", async ({
    page,
  }) => {
    await useExtraItems(page, [item("e2eVapaa")]);
    await newWilma(page, "e2e-vapaa");

    await page.getByPlaceholder("Lisää e2eVapaa", { exact: true }).fill("arvo-1");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "e2eVapaa")).toHaveText("arvo-1");

    await openEditFromViewPage(page);
    await expect(page.getByPlaceholder("Lisää e2eVapaa", { exact: true })).toHaveValue("arvo-1");
  });

  test("pakollinen kenttä estää tallennuksen, kunnes se on täytetty", async ({ page }) => {
    await useExtraItems(page, [item("e2ePakollinen", { mandatory: true, validation: ["notempty"] })]);
    await newWilma(page, "e2e-pakollinen");

    await expect(saveButton(page)).toBeDisabled();

    await page.getByPlaceholder("Lisää e2ePakollinen", { exact: true }).fill("annettu");
    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });
  });

  test("validointisääntö (https): virheellinen arvo estää tallennuksen, kelvollinen sallii", async ({
    page,
  }) => {
    await useExtraItems(page, [item("e2eOsoite", { validation: ["https"] })]);
    await newWilma(page, "e2e-osoite");
    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });

    const input = page.getByPlaceholder("Lisää e2eOsoite", { exact: true });
    await input.fill("http://esimerkki.fi");
    await expect(saveButton(page)).toBeDisabled();

    await input.fill("https://esimerkki.fi");
    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });
    await saveIntegration(page);
    await expect(viewRowValue(page, "e2eOsoite")).toHaveText("https://esimerkki.fi");
  });

  test("valintalista (enum): oletuksena ensimmäinen arvo, valittu arvo tallentuu", async ({ page }) => {
    await useExtraItems(page, [item("e2eValinta", { enum: ["eka", "toka", "kolmas"] })]);
    await newWilma(page, "e2e-valinta");

    const select = fieldRow(page, "e2eValinta").getByRole("combobox");
    await expect(select).toHaveText(/eka/);
    await select.click();
    await page.getByRole("option", { name: "toka", exact: true }).click();
    await expect(select).toHaveText(/toka/);

    await saveIntegration(page);
    await expect(viewRowValue(page, "e2eValinta")).toHaveText("toka");
  });

  test("kytkin (switch + kaksi enum-arvoa): oletuksena ensimmäinen, käännetty arvo tallentuu", async ({
    page,
  }) => {
    await useExtraItems(page, [item("e2eKytkin", { switch: true, enum: ["false", "true"] })]);
    await newWilma(page, "e2e-kytkin");

    const toggle = fieldRow(page, "e2eKytkin").getByRole("checkbox");
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect(toggle).toBeChecked();

    await saveIntegration(page);
    await expect(viewRowValue(page, "e2eKytkin")).toHaveText("true");
  });

  test("ympäristökohtainen kohde (environment 1) näkyy vain Tuotannossa", async ({ page }) => {
    await useExtraItems(page, [item("e2eTuotanto", { environment: 1 })]);
    await newWilma(page, "e2e-tuotanto");

    const input = page.getByPlaceholder("Lisää e2eTuotanto", { exact: true });
    await expect(input).toBeVisible();

    await selectEnvironment(page, "Tuotanto-Testi");
    await expect(input).not.toBeVisible();

    await selectEnvironment(page, "Tuotanto");
    await expect(input).toBeVisible();
  });

  test("näkymätön kohde oletusarvolla: ei lomakkeessa, oletusarvo tallentuu", async ({ page }) => {
    await useExtraItems(page, [
      item("e2ePiilotettu", {
        integrationType: [{ name: "wilma", editable: false, visible: false, defaultValue: "oletus-e2e" }],
      }),
    ]);
    await newWilma(page, "e2e-piilotettu");

    await expect(page.getByText("e2ePiilotettu", { exact: true })).not.toBeVisible();

    await saveIntegration(page);
    await expect(viewRowValue(page, "e2ePiilotettu")).toHaveText("oletus-e2e");
  });

  test("ei-muokattava kohde näytetään tekstinä ilman syötekenttää", async ({ page }) => {
    await useExtraItems(page, [
      item("e2eLukittu", {
        integrationType: [{ name: "wilma", editable: false, visible: true, defaultValue: "lukittu-e2e" }],
      }),
    ]);
    await newWilma(page, "e2e-lukittu");

    await expect(page.getByText("e2eLukittu", { exact: true })).toBeVisible();
    await expect(fieldRow(page, "e2eLukittu").getByText("lukittu-e2e")).toBeVisible();
    await expect(page.getByPlaceholder("Lisää e2eLukittu", { exact: true })).toHaveCount(0);
  });

  test("toisen integraatiotyypin kohde ei näy", async ({ page }) => {
    await useExtraItems(page, [item("e2eOpinsys", { integrationType: [editableFor("opinsys")] })]);
    await newWilma(page, "e2e-toinen-tyyppi");

    await expect(page.getByText("e2eOpinsys", { exact: true })).toHaveCount(0);
    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });
  });
});

test.describe("uudet dataConfiguration-kohteet: muut kohdetyypit", () => {
  test("ADFS: uusi käyttäjäattribuutti (user) näkyy lomakkeessa, tallentuu ja on muokkauksessa esitäytetty", async ({
    page,
  }) => {
    // The view page has no user attribute section for ADFS/Gsuite (its
    // hasAttributes excludes them), so the saved value is checked by
    // reopening the edit form.
    await useExtraItems(page, [item("e2eKayttaja", { type: "user", integrationType: [editableFor("adfs")] })]);
    await mockInstitutionTypes(page);
    await createNewIdpIntegration(page, "ADFS");
    await fillAdfsFields(page);
    await fillCommonIdpSteps(page, "e2e-kayttaja-koulu");

    await page.getByPlaceholder("Lisää e2eKayttaja", { exact: true }).fill("kayttaja-arvo");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await expect(page.getByPlaceholder("Lisää e2eKayttaja", { exact: true })).toHaveValue("kayttaja-arvo");
  });

  test("OIDC: uusi metadatakohde näkyy palvelun metadatassa ja on muokkauksessa esitäytetty", async ({
    page,
  }) => {
    await useExtraItems(page, [item("e2eMetadata", { type: "metadata", integrationType: [editableFor("oidc")] })]);
    await createNewSpIntegration(page, "OpenID Connect");
    await page.getByPlaceholder("Lisää palvelun nimi", { exact: true }).fill("e2e-metadata-palvelu");
    const redirectUriInput = page.getByPlaceholder("Lisää uusi redirect_uris");
    await redirectUriInput.fill("https://sp.esimerkki.fi/oidc/callback");
    await redirectUriInput.press("Enter");

    await page.getByPlaceholder("Lisää e2eMetadata", { exact: true }).fill("metadata-arvo");

    await expect(saveButton(page)).toBeEnabled({ timeout: 15_000 });
    await saveButton(page).click();
    await page.getByRole("button", { name: "OK" }).click();
    await expect(page.getByText("Muutokset tallennettu onnistuneesti")).toBeVisible({ timeout: 15_000 });
    // First OIDC save also shows the client_secret reminder in the same dialog.
    await page.getByRole("button", { name: "OK" }).click();
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await expect(page.getByPlaceholder("Lisää e2eMetadata", { exact: true })).toHaveValue("metadata-arvo");
  });
});
