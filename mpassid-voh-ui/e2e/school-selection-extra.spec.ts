import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  createNewIdpIntegration,
  createNewIdpIntegrationHere,
  createSiblingIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  getMultiSelectOptions,
  goHomeWithoutReload,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
  selectEnvironment,
  selectExcludedSchools,
  selectInstitutionTypes,
  selectSchools,
  toggleExtraSchoolsConfiguration,
} from "./helpers";

// Koulunvalinnan (SchoolSelection.tsx) lisätestit. Täydentää school-selection.spec.ts:n s/m-matriisia: nämä tarkistavat
// TALLENNETUN datan (integraation katselusivun discoveryInformation-rivit)
// eivätkä vain "Tallenna"-napin tilaa.
//
// Tallennus ja getIntegrationDiscoveryInformation kulkevat MSW-service
// workerin kautta, joten page.route() ei näe niitä (ks. save-error.spec.ts).
// Virhe- ja viivetilanteet tuotetaan mockin localStorage-koukuilla
// (src/mocks/requestLogicHandlers.ts: E2E_DISCOVERY_FAIL,
// E2E_DISCOVERY_DELAY_SINGLE_TYPE_MS) - MSW:n handlerit ajetaan sivun omassa
// JS-kontekstissa, joten ne lukevat sivun localStoragea.

const PERUSKOULUT = "Peruskoulut (11)";
const LUKIOT = "Lukiot (15)";
const A = "Mansikkalan itäinen peruskoulu"; // 30074
const B = "Mansikkalan pohjoinen peruskoulu"; // 30075
const C = "Mansikkalan testi peruskoulu"; // 30076
const D = "Mansikkalan testi lukio"; // 30077
const CODE = { A: "30074", B: "30075", C: "30076", D: "30077" };

// Kirjoitusvirhe "integraatiohin" on sovelluksen tekstissä (Validators.tsx).
const EXTRA_EXCLUDES_HELPER =
  "Kaikki muihin integraatiohin lisätyt koulut lisätään automaattisesti";

const E2E_DISCOVERY_FAIL = "e2e-discovery-fail";
const E2E_DISCOVERY_DELAY_SINGLE_TYPE_MS = "e2e-discovery-delay-single-type-ms";

/**
 * Options come in the organisation's child order (schemas/organizations.json),
 * which is not meaningful here - compare as sets.
 */
const sorted = (values: string[]) => [...values].sort();

/** Sets a mock hook flag (read by requestLogicHandlers.ts in the page). */
async function setMockFlag(page: Page, key: string, value: string) {
  await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [key, value]);
}

/**
 * Value cell of a row on the integration VIEW page
 * (integraatio/IntegrationTab/IntegrationDetails/index.tsx:103-126). Rows
 * without a translation show the raw attribute name as label ("schools",
 * "excludedSchools"); DataRowBase wraps it in Tooltip+<span>, so walk up to
 * the label's grid cell and take the next cell.
 */
function viewRowValue(page: Page, label: string) {
  return page
    .getByText(label, { exact: true })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-root ")][1]/following-sibling::*[1]'
    );
}

/** A DataRowTitle-labelled switch in SchoolSelection (same walk as toggleExtraSchoolsConfiguration). */
function schoolSwitch(page: Page, label: "Näytetäänkö koulut" | "Lisää kouluvalinta säännöt") {
  return page
    .getByText(label, { exact: true })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " MuiGrid-root ")][1]/following-sibling::*[1]'
    )
    .getByRole("checkbox");
}

async function createIntegrationUnderTest(page: Page, name: string, alreadyHome = false) {
  if (alreadyHome) {
    // Keeps the mock's in-memory sibling integrations (a page.goto would wipe them).
    await createNewIdpIntegrationHere(page, "Wilma");
  } else {
    await createNewIdpIntegration(page, "Wilma");
  }
  await fillWilmaFields(page, `${name}.inschool.fi`);
  await selectEnvironment(page, "Tuotanto");
  await fillCommonIdpSteps(page, `${name}-koulu`);
}

test.describe("koulunvalinta: tallennettu data", () => {
  test("omat poissulut (schools=[]) tallentuvat ja säilyvät muokkauksessa", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "omat-poissulut");
    await toggleExtraSchoolsConfiguration(page);
    // Ei sisarta -> ei muiden integraatioiden kouluja lisättäväksi.
    await expect(page.getByText(EXTRA_EXCLUDES_HELPER)).not.toBeVisible();
    await selectExcludedSchools(page, [A]);
    // Poissulun valinta piilottaa sisällytysvalinnan (SchoolSelection.tsx:1070-1071).
    await expect(page.getByText("schools", { exact: true })).not.toBeVisible();

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "excludedSchools")).toHaveText(CODE.A);
    await expect(viewRowValue(page, "schools")).toHaveText("–");

    // Muokkaus: avaus ajaa koulutietojen latauksen, jonka jälkeen omat
    // poissulut ovat yhä luonnoksessa. Muutetaan toista kenttää, jotta "ei muutoksia" -portti ei estä tallennusta.
    await openEditFromViewPage(page);
    await fillWilmaFields(page, "omat-poissulut-v2.inschool.fi");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "excludedSchools")).toHaveText(CODE.A);
  });

  test("koulunäkymän pois kytkeminen tyhjentää koulut tallennetusta datasta", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "nakyma-pois");
    await toggleExtraSchoolsConfiguration(page);
    await selectSchools(page, [B]);
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "schools")).toHaveText(CODE.B);

    await openEditFromViewPage(page);
    await schoolSwitch(page, "Näytetäänkö koulut").click();
    await expect(page.getByText("Oppilaitostyypit", { exact: true })).not.toBeVisible();
    await fillWilmaFields(page, "nakyma-pois-v2.inschool.fi");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await expect(viewRowValue(page, "Näytetäänkö koulut")).toHaveText("Ei");
    await expect(viewRowValue(page, "schools")).toHaveText("–");
    await expect(viewRowValue(page, "excludedSchools")).toHaveText("–");
  });

  test("tallennettu logo näkyy muokkauksessa eikä logo ole enää pakollinen", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "logo");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await expect(page.getByAltText("organisaation logo")).toBeVisible();
    await expect(page.getByText("Valitse", { exact: true })).toBeVisible();
    await expect(page.getByText("Valitse, logo on pakollinen")).not.toBeVisible();
  });
});

test.describe("koulunvalinta: saman organisaation muut integraatiot", () => {
  test("toisen integraation koulu A lisätään automaattisesti omiin poissulkuihin", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A],
    });
    await createIntegrationUnderTest(page, "auto-poissulku", true);

    // Sääntökytkin pakotetaan päälle ja lukitaan, kun sisar on olemassa.
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeChecked();
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeDisabled();
    // A on jo toisessa integraatiossa, joten sitä ei voi sisällyttää.
    expect(sorted(await getMultiSelectOptions(page, "schools"))).toEqual(sorted([B, C]));

    // Poissulkukentän ohje (fieldHelpers.tsx excludedSchoolsHelperText):
    // näytetään, kun sisarilla on omia sisällytyksiä (eSI ei tyhjä).
    await expect(page.getByText(EXTRA_EXCLUDES_HELPER)).toBeVisible();

    await selectExcludedSchools(page, [B]);
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    const excluded = viewRowValue(page, "excludedSchools");
    await expect(excluded).toContainText(CODE.A);
    await expect(excluded).toContainText(CODE.B);
    await expect(viewRowValue(page, "schools")).toHaveText("–");
  });

  test("kun kaikki jäljellä olevat koulut suljetaan pois, näytetään 'Kouluja ei jäänyt jäljelle!'", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A],
    });
    await createIntegrationUnderTest(page, "ei-jaljella", true);

    await selectExcludedSchools(page, [B, C]);

    await expect(page.getByText("Kouluja ei jäänyt jäljelle!")).toBeVisible();
  });

  test("koulutietojen haun virhe -> tarjolla valitun tyypin kaikki koulut", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createNewIdpIntegration(page, "Wilma");
    await setMockFlag(page, E2E_DISCOVERY_FAIL, "1");
    await fillWilmaFields(page, "hakuvirhe.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    await fillCommonIdpSteps(page, "hakuvirhe-koulu");

    await toggleExtraSchoolsConfiguration(page);
    expect(sorted(await getMultiSelectOptions(page, "schools"))).toEqual(sorted([A, B, C]));
  });

  test("vaihto Tuotanto -> Tuotanto-Testi vapauttaa säännöt: kytkin käytettävissä, kaikki koulut tarjolla", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A],
    });
    await createIntegrationUnderTest(page, "ymparisto", true);
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeDisabled();

    await selectEnvironment(page, "Tuotanto-Testi");

    // Lukitus koskee vain Tuotantoa (SchoolSelection.tsx:1064-1066).
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeEnabled();
    expect(sorted(await getMultiSelectOptions(page, "schools"))).toEqual(sorted([A, B, C]));
  });
});

test.describe("koulunvalinta: esimerkkiteksti", () => {
  test("otsikko näkyy esimerkissä sulkeissa ja tyhjennys poistaa sulkeet", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "otsikko");

    const title = page.getByPlaceholder("Lisää title", { exact: true });
    await title.fill("Testiotsikko");
    await expect(page.getByText(/^Esim\. .+ \(Testiotsikko\)$/)).toBeVisible();

    await title.fill("");
    await expect(page.getByText(/^Esim\. [^()]+$/)).toBeVisible();
  });
});

test.describe("koulunvalinta: korjatut bugit", () => {
  test("myöhässä saapuva vanha haku ei saa ylikirjoittaa uudempaa oppilaitostyyppivalintaa", async ({
    page,
  }) => {
    // Haut tehdään vain useSiblingSchoolConfig-hookissa, joka jättää
    // vanhentuneen avaimen vastauksen huomiotta.
    await mockInstitutionTypes(page);
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A],
    });
    // Yhden tyypin ([11]) haut viivästyvät, kahden tyypin ([11,15]) eivät.
    await setMockFlag(page, E2E_DISCOVERY_DELAY_SINGLE_TYPE_MS, "3000");
    await createIntegrationUnderTest(page, "kilpailu", true); // valitsee Peruskoulut -> hidas haku
    await selectInstitutionTypes(page, [LUKIOT]); // -> nopea haku, molemmat tyypit

    // Molemmat tyypit valittuna -> kaikkien tyyppien koulut, myös lukio D.
    // Bugissa hidas [11]-vastaus saapuu viimeisenä ja palauttaa vain [B, C].
    await page.waitForTimeout(4000);
    await expect
      .poll(() => getMultiSelectOptions(page, "schools"), { timeout: 5000 })
      .toContain(D);
  });

  test("Tuotanto-Testi-integraatioon ei saa tallentua tuotantosisarten kouluja poissuluiksi", async ({
    page,
  }) => {
    // Korjattu (tarkistuksen löydös 2): ei-tuotantohaara ei nollannut
    // sisartietoja, joten updateExcludeSchools lisäsi tuotantosisaren koulun A
    // poissuluksi myös Tuotanto-Testi-integraatioon. Nyt ei-tuotannossa
    // existingIncluded/Excluded = null (ei sisaria).
    await mockInstitutionTypes(page);
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A],
    });
    await createIntegrationUnderTest(page, "ymparisto-tallennus", true);
    await selectEnvironment(page, "Tuotanto-Testi");

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "excludedSchools")).toHaveText("–");
  });
});

test.describe("koulunvalinta: konsolivahti", () => {
  test("SchoolSelection ei päivitä vanhemman tilaa renderöinnin aikana", async ({
    page,
  }, testInfo) => {
    // Rikkova: luonnoksen tarkistus ajetaan efektissä eikä renderöinnissä.
    const warnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("Cannot update a component")) warnings.push(msg.text());
    });

    await mockInstitutionTypes(page);
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A],
    });
    await createIntegrationUnderTest(page, "konsolivahti", true);
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeChecked();

    testInfo.annotations.push({
      type: "render-phase-warnings",
      description: String(warnings.length),
    });
    expect(warnings).toEqual([]);
  });
});

test.describe("koulunvalinta: integraatio A -> B samassa istunnossa", () => {
  test("seuraava integraatio ei peri edellisen koulunvalintoja", async ({ page }) => {
    // <SchoolSelection key={integration.id}>. Tuotanto-Testi, jotta
    // A ei ole B:n tuotantosisar (sisarsäännöt eivät vaikuta tulokseen).
    await mockInstitutionTypes(page);
    await createNewIdpIntegration(page, "Wilma");
    await fillWilmaFields(page, "a-integraatio.inschool.fi");
    await selectEnvironment(page, "Tuotanto-Testi");
    await fillCommonIdpSteps(page, "a-koulu");
    await toggleExtraSchoolsConfiguration(page);
    await selectExcludedSchools(page, [A]);
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "excludedSchools")).toHaveText(CODE.A);

    // B samassa SPA-istunnossa (ei sivun uudelleenlatausta).
    await goHomeWithoutReload(page);
    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "b-integraatio.inschool.fi");
    await selectEnvironment(page, "Tuotanto-Testi");
    await fillCommonIdpSteps(page, "b-koulu");
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).not.toBeChecked();
    await toggleExtraSchoolsConfiguration(page);
    // A:n poissulut piilottaisivat sisällytysvalinnan.
    await expect(page.getByText("schools", { exact: true })).toBeVisible();
    await expect(page.getByText("excludedSchools", { exact: true })).toBeVisible();
    await selectSchools(page, [B]);
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "schools")).toHaveText(CODE.B);
    await expect(viewRowValue(page, "excludedSchools")).toHaveText("–");

    // B:n muokkaus näyttää B:n omat valinnat.
    await openEditFromViewPage(page);
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeChecked();
    await expect(page.getByText("schools", { exact: true })).toBeVisible();
    await expect(page.getByText("excludedSchools", { exact: true })).not.toBeVisible();
  });
});

// Valintanäkymän kytkimet ja nimet (SchoolSelection.tsx
// handleShowSchoolsChange, changeExtraSchoolsConfiguration,
// handleCustomDisplayNameChange, updateInstitutionTypes).
const ORGANIZATION = "Mansikkalan testi kunta";
const ADMIN_CONFIG_NOTICE =
  "Valittuja oppilaitostyyppejä jo muissa integraatioissa, muokkaaminen mahdollistaa saman koulun näkymisen useassa integraatiossa";
const displayNameInput = (page: Page) => page.getByPlaceholder("Lisää OKJ:n näyttönimi", { exact: true });
const titleInput = (page: Page) => page.getByPlaceholder("Lisää title", { exact: true });

test.describe("koulunvalinta: näkymän kytkimet ja nimet", () => {
  test("koulunäkymä takaisin päälle: otsikoksi organisaatio, organisaation nimen näyttönimi tyhjenee", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "nakyma-takaisin");
    await expect(titleInput(page)).toHaveValue(ORGANIZATION);

    // Off: the title goes, an own display name stays.
    await schoolSwitch(page, "Näytetäänkö koulut").click();
    await expect(titleInput(page)).toHaveCount(0);
    await expect(displayNameInput(page)).toHaveValue("nakyma-takaisin-koulu");

    // Back on: the title is the organisation's name again, the own display
    // name is kept, and the school view (types empty) is shown again.
    await schoolSwitch(page, "Näytetäänkö koulut").click();
    await expect(titleInput(page)).toHaveValue(ORGANIZATION);
    await expect(displayNameInput(page)).toHaveValue("nakyma-takaisin-koulu");
    await expect(page.getByText("Oppilaitostyypit", { exact: true })).toBeVisible();

    // A display name that is just the organisation's name (the default with
    // the view off) is cleared when the view is switched on.
    await schoolSwitch(page, "Näytetäänkö koulut").click();
    await displayNameInput(page).fill(ORGANIZATION);
    await schoolSwitch(page, "Näytetäänkö koulut").click();
    await expect(displayNameInput(page)).toHaveValue("");
    await expect(titleInput(page)).toHaveValue(ORGANIZATION);
  });

  test("koulunäkymän pois kytkeminen tyhjällä näyttönimellä: näyttönimeksi organisaatio", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "nakyma-pois-tyhja");

    await displayNameInput(page).fill("");
    await schoolSwitch(page, "Näytetäänkö koulut").click();
    await expect(displayNameInput(page)).toHaveValue(ORGANIZATION);

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "OKJ:n näyttönimi")).toHaveText(ORGANIZATION);
    await expect(viewRowValue(page, "Näytetäänkö koulut")).toHaveText("Ei");
  });

  test("kouluvalintasääntöjen pois kytkeminen tyhjentää valitut koulut", async ({ page }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "saannot-pois");
    await toggleExtraSchoolsConfiguration(page);
    await selectSchools(page, [B]);

    await schoolSwitch(page, "Lisää kouluvalinta säännöt").click();
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).not.toBeChecked();
    await expect(page.getByText("schools", { exact: true })).toHaveCount(0);

    // Back on: the earlier choice is gone.
    await schoolSwitch(page, "Lisää kouluvalinta säännöt").click();
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeChecked();
    await expect(page.getByText(B, { exact: true })).toHaveCount(0);
    await schoolSwitch(page, "Lisää kouluvalinta säännöt").click();

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "schools")).toHaveText("–");
    await expect(viewRowValue(page, "excludedSchools")).toHaveText("–");
  });

  test("OKJ:n näyttönimen tyhjennys poistaa sen tallennetusta datasta", async ({ page }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "nayttonimi-tyhja");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "OKJ:n näyttönimi")).toHaveText("nayttonimi-tyhja-koulu");

    await openEditFromViewPage(page);
    await displayNameInput(page).fill("");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "OKJ:n näyttönimi")).toHaveText("");

    await openEditFromViewPage(page);
    await expect(displayNameInput(page)).toHaveValue("");
  });

  test("monityyppinen tuotantointegraatio: varoitus palaa, kun toinen tyyppi lisätään takaisin", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    // The notice needs another production integration of the same types.
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [C],
    });
    await createIntegrationUnderTest(page, "monityyppi", true);
    await selectInstitutionTypes(page, [LUKIOT]);
    await selectSchools(page, [A]);
    await expect(page.getByText(ADMIN_CONFIG_NOTICE)).toBeVisible();
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    // Saved with several types and its own schools: the notice is on.
    await openEditFromViewPage(page);
    await expect(page.getByText(ADMIN_CONFIG_NOTICE)).toBeVisible();

    // One type left: off. Both again: on (updateInstitutionTypes).
    await selectInstitutionTypes(page, [LUKIOT]);
    await expect(page.getByText(ADMIN_CONFIG_NOTICE)).not.toBeVisible();
    await selectInstitutionTypes(page, [LUKIOT]);
    await expect(page.getByText(ADMIN_CONFIG_NOTICE)).toBeVisible();
  });
});

test.describe("koulunvalinta: Tuotanto-Testi -> Tuotanto, kun koulut ovat jo käytössä", () => {
  test("kaikki koulut jo tuotantointegraatiossa -> varoitus näkyy eikä tallennus onnistu", async ({
    page,
  }) => {
    // Kaksi Wilma-idp:tä samoilla arvoilla: yksi oppilaitostyyppi (Peruskoulut)
    // ja sen kaikki koulut valittuna. Ensimmäinen Tuotantoon, toinen
    // Tuotanto-Testiin (ei sisarsääntöjä). Kun toinen vaihdetaan Tuotantoon,
    // ensimmäinen on sen tuotantosisar, jolla on jo kaikki koulut.
    //
    // Päätös (avoin kysymys 3): integraation omat alkuperäiset koulut pysyvät
    // tarjolla vain, jos se oli Tuotannossa avattaessa. Tämä avattiin
    // Tuotanto-Testissä, joten muiden käyttämiä kouluja ei tarjota. Ne
    // säilyvät valintoina ja niistä varoitetaan (ei hiljaista poistoa).
    const hostname = "kaikki-koulut.inschool.fi";
    const displayName = "Kaikki koulut -koulu";
    const fillSameValues = async (environment: "Tuotanto" | "Tuotanto-Testi") => {
      await fillWilmaFields(page, hostname);
      await selectEnvironment(page, environment);
      await fillCommonIdpSteps(page, displayName);
      await toggleExtraSchoolsConfiguration(page);
      await selectSchools(page, [A, B, C]);
    };

    await mockInstitutionTypes(page);
    await createNewIdpIntegration(page, "Wilma");
    await fillSameValues("Tuotanto");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    const schools = viewRowValue(page, "schools");
    await expect(schools).toContainText(CODE.A);
    await expect(schools).toContainText(CODE.B);
    await expect(schools).toContainText(CODE.C);

    // Toinen samassa SPA-istunnossa, jotta mock muistaa ensimmäisen.
    await goHomeWithoutReload(page);
    await createNewIdpIntegrationHere(page, "Wilma");
    await fillSameValues("Tuotanto-Testi");
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(page.getByText("Tuotanto-Testi", { exact: true })).toBeVisible();

    await openEditFromViewPage(page);
    await selectEnvironment(page, "Tuotanto");
    // Tuotannossa sisar löytyy: sääntökytkin lukittuu (odotetaan latausta).
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeDisabled();

    await expect(page.getByRole("button", { name: "Tallenna" })).toBeDisabled();
    await expect(
      page.getByText("Kaikki koulut ovat jo käytössä muissa integraatioissa")
    ).toBeVisible();
    // Sallimattomia kouluja ei poisteta hiljaa: niistä varoitetaan nimeltä.
    const notAllowed = page.getByText(/eivät ole sallittuja Tuotannossa/);
    await expect(notAllowed).toBeVisible();
    await expect(notAllowed).toContainText(A);
    await expect(notAllowed).toContainText(B);
    await expect(notAllowed).toContainText(C);
    // Pysyy estettynä myös latauksen asetuttua.
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: "Tallenna" })).toBeDisabled();

    // Käyttäjä poistaa ne itse (merkitty valinnoissa) -> varoitus poistuu.
    // Ei selectSchools(): poistettu "(ei sallittu)" -rivi katoaa valikosta, ja
    // kun fokusoitu rivi poistuu, sivun Escape ei sulje valikkoa - avoin
    // valikko piilottaisi muun sivun (aria-hidden) Tallenna-tarkistukselta.
    await page
      .getByText("schools", { exact: true })
      .locator("xpath=following-sibling::*[1]")
      .getByRole("combobox")
      .click();
    const notAllowedOption = (name: string) =>
      page.getByRole("option", { name: `${name} (ei sallittu)`, exact: true });
    await notAllowedOption(A).click();
    await notAllowedOption(B).click();
    await notAllowedOption(C).click();
    const listbox = page.getByRole("listbox");
    await expect(listbox.getByRole("option", { name: "Ei valintoja" })).toBeDisabled();
    await listbox.press("Escape");
    await expect(listbox).not.toBeVisible();
    await expect(notAllowed).not.toBeVisible();
    // Kouluja ei jää tarjolle, joten tallennus pysyy estettynä.
    await expect(page.getByRole("button", { name: "Tallenna" })).toBeDisabled();
  });
});

test.describe("koulunvalinta: Tuotanto-Testi -> Tuotanto, ainoa koulu omassa käytössä", () => {
  // Raportoitu 2026-10-30: oppilaitostyypillä on vain yksi koulu. Uusi
  // Wilma Tuotanto-Testiin tällä koululla, tallennus, heti muokkaus ja
  // vaihto Tuotantoon -> "Kaikki koulut ovat jo käytössä muissa
  // integraatioissa", vaikka muita integraatioita ei ole. Ei toistu, jos
  // sivu ladataan tallennuksen ja muokkauksen välissä. Ero polkujen välillä:
  // heti tallennuksen jälkeen muokkaus sai navigoinnin mukana
  // tallennusvastauksen, jossa backend ei palauta organisaation kouluja
  // (mock tekee samoin, requestLogicHandlers.ts saveResponse).
  // Korjaus: EditIntegrationButton hakee tällöin integraation uudelleen ja
  // muokkaus lataa sen id:llä.
  const createOnlyLukioInTuotantoTesti = async (page: Page) => {
    await mockInstitutionTypes(page);
    await createNewIdpIntegration(page, "Wilma");
    await fillWilmaFields(page, "ainoa-koulu.inschool.fi");
    await selectEnvironment(page, "Tuotanto-Testi");
    await fillCommonIdpSteps(page, "Ainoan koulun koulu");
    // Only Lukiot (one school, D): add it and drop Peruskoulut.
    await selectInstitutionTypes(page, [LUKIOT, PERUSKOULUT]);
    await toggleExtraSchoolsConfiguration(page);
    expect(await getMultiSelectOptions(page, "schools")).toEqual([D]);
    await selectSchools(page, [D]);
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "schools")).toHaveText(CODE.D);
  };

  const expectOwnSchoolStillAllowed = async (page: Page) => {
    await selectEnvironment(page, "Tuotanto");
    // Wait for the production load: the switch is enabled again afterwards.
    await expect(schoolSwitch(page, "Lisää kouluvalinta säännöt")).toBeEnabled();
    await page.waitForTimeout(1000);
    await expect(
      page.getByText("Kaikki koulut ovat jo käytössä muissa integraatioissa")
    ).not.toBeVisible();
    await expect(page.getByText(/eivät ole sallittuja Tuotannossa/)).not.toBeVisible();
    expect(await getMultiSelectOptions(page, "schools")).toEqual([D]);
  };

  test("heti tallennuksen jälkeen avattu muokkaus", async ({ page }) => {
    await createOnlyLukioInTuotantoTesti(page);
    await openEditFromViewPage(page);
    await expectOwnSchoolStillAllowed(page);
  });

  test("uudelleenlatauksen jälkeen avattu muokkaus (vertailu)", async ({ page }) => {
    await createOnlyLukioInTuotantoTesti(page);
    await page.reload();
    await expect(viewRowValue(page, "schools")).toHaveText(CODE.D, { timeout: 15_000 });
    await openEditFromViewPage(page);
    await expectOwnSchoolStillAllowed(page);
  });
});

test.describe("koulunvalinta: oppilaitostyypin poisto karsii sen tyypin koulut", () => {
  // Päätös 2026-10-13: kun oppilaitostyyppi poistetaan, sen tyypin valitut ja
  // poissuljetut koulut poistetaan (myös Tuotannossa, jossa ennen ei karsittu).
  test("valitut koulut", async ({ page }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "tyyppikarsinta-koulut");
    await selectInstitutionTypes(page, [LUKIOT]);
    await toggleExtraSchoolsConfiguration(page);
    await selectSchools(page, [A, D]);

    await selectInstitutionTypes(page, [LUKIOT]); // poistaa Lukiot

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "schools")).toHaveText(CODE.A);
  });

  test("poissuljetut koulut", async ({ page }) => {
    await mockInstitutionTypes(page);
    await createIntegrationUnderTest(page, "tyyppikarsinta-poissulut");
    await selectInstitutionTypes(page, [LUKIOT]);
    await toggleExtraSchoolsConfiguration(page);
    await selectExcludedSchools(page, [B, D]);

    await selectInstitutionTypes(page, [LUKIOT]); // poistaa Lukiot

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);
    await expect(viewRowValue(page, "excludedSchools")).toHaveText(CODE.B);
  });
});

// Ei toteutettu tässä:
// - 13 (s9): ei muutettu. s9 on todennäköisesti testin oma artefakti - se on
//   matriisin ainoa testi, joka avaa muokkauksen muuttamatta mitään, jolloin
//   vanhemman "ei muutoksia" -portti estää tallennuksen. Päätös tehdään
//   school-selection.spec.ts:ään erikseen.
