import { expect, test } from "@playwright/test";
import {
  createNewIdpIntegration,
  createNewIdpIntegrationHere,
  createSiblingIdpIntegration,
  fillCommonIdpSteps,
  fillWilmaFields,
  getMultiSelectOptions,
  logBrowserConsole,
  mockInstitutionTypes,
  openEditFromViewPage,
  saveIntegration,
  selectEnvironment,
  selectInstitutionTypes,
  selectSchools,
} from "./helpers";

// Koulunvalinta (SchoolSelection.tsx) luonti/muokkaus-matriisi. Fixtures:
// mockInstitutionTypes() -> "Peruskoulut (11)"/"Lukiot (15)"; the four
// schools live in schemas/organizations.json:
//   30074 "Mansikkalan itäinen peruskoulu"   oppilaitostyyppi 11
//   30075 "Mansikkalan pohjoinen peruskoulu" oppilaitostyyppi 11
//   30076 "Mansikkalan testi peruskoulu"     oppilaitostyyppi 11
//   30077 "Mansikkalan testi lukio"          oppilaitostyyppi 15
//
// existingIncluded/existingExcluded (SchoolSelection.tsx's eSI/eSE) are NOT a
// static mock response - requestLogicHandlers.ts's
// getIntegrationDiscoveryInformationValue derives them by scanning every
// *other* active, Tuotanto (deploymentPhase===1) idp integration of the same
// organization that shares at least one institutionType, and unioning their
// discoveryInformation.schools/excludedSchools. To reproduce a given
// existingIncluded/existingExcluded pair, a matching "sibling" integration is
// created for real via createSiblingIdpIntegration() before the integration
// under test. Every s1-s10/m1-m11 sibling below has institutionTypes
// [Peruskoulut, Lukiot] (both) so it can legitimately hold all four school
// codes; the *new*, tested integration then picks only "Peruskoulut" (s -
// "sama/yksi oppilaitostyyppi") or both types (m - "oppilaitostyyppien
// setti"), which is what actually varies existingIncluded/existingExcluded's
// *effect* between the s- and m-series even though the raw arrays are
// identical.
//
// The whole feature is gated on Tuotanto: updateExtraSchoolsConfigurationData
// (SchoolSelection.tsx:571) only calls getIntegrationDiscoveryInformation at
// all when environment===1 - every test below sets Tuotanto explicitly.
//
// Ordering matters: fillCommonIdpSteps() ALWAYS selects "Peruskoulut (11)"
// itself (it's shared with every other create-*.spec.ts test) - it must run
// BEFORE selectInstitutionTypes()/selectSchools() here, and
// selectInstitutionTypes() must only ever be passed *additional* labels
// ("Lukiot (15)"), never "Peruskoulut (11)" again (re-clicking an
// already-checked MUI multi-select option toggles it back off).
//
// IMPORTANT ASYMMETRY discovered while writing the m-series below:
// isExtraSchoolConfigurationOk()'s multi-institutionType branch
// (SchoolSelection.tsx:270-275, taken whenever institutionTypeList.length>1)
// never inspects eSI/eSE at all - it only requires OUR OWN schools or
// excludedSchools to be non-empty. updateExtraSchoolsConfigurationData
// (SchoolSelection.tsx:593-596) also overrides possibleSchools to *every*
// school matching our chosen types the moment institutionTypeList.length>1,
// bypassing analyseExistingInclude's eSI/eSE-derived restriction entirely.
// Net effect: for the whole m-series, any single valid pick should enable
// "Tallenna" regardless of what the sibling(s) restrict - m8/m9/m10 (mirrored
// from s8/s9/s10 per earlier instruction) likely do NOT reproduce those
// three's "nok" outcomes. Every m8/m9/m10 test below asserts "ok" per this
// code reading - please tell me if any of them actually comes back disabled
// so I can correct this.

const PERUSKOULUT = "Peruskoulut (11)";
const LUKIOT = "Lukiot (15)";
const A = "Mansikkalan itäinen peruskoulu"; // 30074
const B = "Mansikkalan pohjoinen peruskoulu"; // 30075
const C = "Mansikkalan testi peruskoulu"; // 30076
const D = "Mansikkalan testi lukio"; // 30077

// Warning shown by SchoolSelection.tsx whenever adminConfiguration is true
// AND a sibling actually exists (noExistingSchoolConfigurations.current ===
// false). Tracing analyseExistingExclude()/analyseExistingInclude() for every
// m-scenario below: whenever institutionTypeList.length>1 (always true for
// the m-series) and a sibling match exists, adminConfiguration ends up true
// regardless of eSI/eSE's shape - the only thing gating the Alert is whether
// a sibling exists at all. So it's expected visible for every m1-m11 test
// (all of which create a sibling first) and absent for m0 (no sibling).
const ADMIN_CONFIG_NOTICE =
  "Valittuja oppilaitostyyppejä jo muissa integraatioissa, muokkaaminen mahdollistaa saman koulun näkymisen useassa integraatiossa";

test.describe("koulunvalinta - ei vanhoja saman oppilaitostyypin integraatioita", () => {
  test("s0: ei siblingiä, uusi integraatio yksi oppilaitostyyppi - luonti ja muokkaus ok", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createNewIdpIntegration(page, "Wilma");
    await fillWilmaFields(page, "s0.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    // No sibling exists (eSI=eSE=null) -> analyseExistingInclude's else
    // branch (SchoolSelection.tsx:492-500): extraSchoolConfigurationNeeded
    // stays false, so "Lisää kouluvalinta säännöt" is not forced on and
    // schools/excludedSchools stay untouched/optional - saveCheck() only
    // needs the logo+customDisplayName below. fillCommonIdpSteps() selects
    // "Peruskoulut (11)" as part of this.
    await fillCommonIdpSteps(page, "s0-koulu");

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await fillWilmaFields(page, "s0-v2.inschool.fi");
    await saveIntegration(page);
  });

  test("m0: ei siblingiä, uusi integraatio molemmat oppilaitostyypit - luonti ja muokkaus ok", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createNewIdpIntegration(page, "Wilma");
    await fillWilmaFields(page, "m0.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    await fillCommonIdpSteps(page, "m0-koulu");
    await selectInstitutionTypes(page, [LUKIOT]);
    // No sibling exists -> noExistingSchoolConfigurations.current stays true,
    // which blocks the Alert regardless of adminConfiguration's own value.
    await expect(page.getByText(ADMIN_CONFIG_NOTICE)).not.toBeVisible();

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await fillWilmaFields(page, "m0-v2.inschool.fi");
    await saveIntegration(page);
  });
});

test.describe("koulunvalinta - vanha saman oppilaitostyypin integraatio (s-sarja, uusi = Peruskoulut)", () => {
  test("s1: sibling excludedSchools=[A,B,C,D], schools=[] - luonti ja muokkaus ok", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      excludedSchools: [A, B, C, D],
    });
    // -> eSI=[] (sibling's own "schools" is empty), eSE=[A,B,C,D].

    // createNewIdpIntegrationHere(), NOT createNewIdpIntegration() - the
    // latter's page.goto("/") would wipe the just-saved sibling from the
    // mock's in-memory allIntegrations before this integration's own
    // institutionType selection ever queries getIntegrationDiscoveryInformation.
    // createSiblingIdpIntegration() already left us on "/" via
    // goHomeWithoutReload().
    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "s1.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    // isExtraSchoolConfigurationOk()'s single-institutionType branch
    // (SchoolSelection.tsx:234-239) requires OUR excludedSchools to stay
    // empty here (eSI===[] forbids picking any), but its own final clause
    // (SchoolSelection.tsx:261-266) *also* requires OUR schools or
    // excludedSchools to be non-empty regardless of what the sibling
    // restricts - "leave everything untouched" (my original guess) can never
    // satisfy both at once. The only way through is picking from "schools"
    // (include) instead: analyseExistingInclude's "eSI.length=0 and
    // eSE.length>0" branch (SchoolSelection.tsx:419-431) sets possibleSchools
    // to allSchools ∩ eSE = {A,B,C} (D is Lukiot, filtered out by our single
    // Peruskoulut type) for exactly this purpose.
    await fillCommonIdpSteps(page, "s1-koulu");
    // "schools" must offer exactly {A,B,C} - allSchools(Peruskoulut) ∩ eSE,
    // per the comment above (D is Lukiot, filtered out by our single type).
    expect((await getMultiSelectOptions(page, "schools")).sort()).toEqual(
      [A, B, C].sort()
    );
    await selectSchools(page, [A]);

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await fillWilmaFields(page, "s1-v2.inschool.fi");
    await saveIntegration(page);
  });

  // s2-s5 all share s1's shape (eSI=[], varying eSE) - "A" is in every one of
  // these eSE lists, and possibleSchools for the "schools" field is always
  // allSchools(Peruskoulut) ∩ eSE, so picking A works uniformly. See s1's
  // comment above for the full reasoning.
  const eSEOnlyScenarios: { name: string; excludedSchools: string[] }[] = [
    { name: "s2", excludedSchools: [A, B, C] },
    { name: "s3", excludedSchools: [A, B] },
    { name: "s4", excludedSchools: [A] },
    { name: "s5", excludedSchools: [A, D] },
  ];

  const shortCode = (label: string) => ({ [A]: "A", [B]: "B", [C]: "C", [D]: "D" }[label] || label);

  for (const scenario of eSEOnlyScenarios) {
    test(`${scenario.name}: sibling excludedSchools=[${scenario.excludedSchools.map(shortCode).join(",")}] - luonti ja muokkaus ok`, async ({
      page,
    }) => {
      await mockInstitutionTypes(page);
      logBrowserConsole(page);

      await createSiblingIdpIntegration(page, {
        institutionTypeLabels: [PERUSKOULUT, LUKIOT],
        excludedSchools: scenario.excludedSchools,
      });

      await createNewIdpIntegrationHere(page, "Wilma");
      await fillWilmaFields(page, `${scenario.name}.inschool.fi`);
      await selectEnvironment(page, "Tuotanto");
      await fillCommonIdpSteps(page, `${scenario.name}-koulu`);
      // "schools" must offer exactly allSchools(Peruskoulut) ∩ eSE - see the
      // comment above the scenario list.
      const expectedSchoolsOptions = [A, B, C].filter((s) =>
        scenario.excludedSchools.includes(s)
      );
      expect((await getMultiSelectOptions(page, "schools")).sort()).toEqual(
        expectedSchoolsOptions.sort()
      );
      await selectSchools(page, [A]);

      await saveIntegration(page);
      await expect(page).toHaveURL(/\/integraatio\/\d+/);

      await openEditFromViewPage(page);
      await fillWilmaFields(page, `${scenario.name}-v2.inschool.fi`);
      await saveIntegration(page);
    });
  }

  test("s6: sibling schools=[B] + excludedSchools=[A,D] (kaksi siblingiä) - luonti ja muokkaus ok", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    // A schools+excludedSchools combination can't come from one sibling
    // (SchoolSelection.tsx only ever shows one of the two fields at a time) -
    // two siblings, unioned by the mock, produce eSI=[B]/eSE=[A,D] together.
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [B],
    });
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      excludedSchools: [A, D],
      alreadyHome: true,
    });
    // -> eSI=[B], eSE=[A,D].

    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "s6.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    await fillCommonIdpSteps(page, "s6-koulu");
    // eSI=[B] is non-empty, so (unlike s1-s5) the "excludedSchools must stay
    // empty" constraint (SchoolSelection.tsx:234-239) doesn't apply here.
    // analyseExistingInclude's "eSI.length>0 and eSE.length>0" branch
    // (SchoolSelection.tsx:457-474) computes possibleSchools = allSchools
    // (Peruskoulut) ∩ eSE ∩ (not in eSI) = {A,B,C} ∩ [A,D] ∩ (not B) = {A} -
    // A is the only valid "schools" pick.
    expect(await getMultiSelectOptions(page, "schools")).toEqual([A]);
    await selectSchools(page, [A]);

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await fillWilmaFields(page, "s6-v2.inschool.fi");
    await saveIntegration(page);
  });

  test("s7: sibling schools=[B,C] + excludedSchools=[A,D] (kaksi siblingiä) - luonti ja muokkaus ok", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [B, C],
    });
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      excludedSchools: [A, D],
      alreadyHome: true,
    });
    // -> eSI=[B,C], eSE=[A,D].

    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "s7.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    await fillCommonIdpSteps(page, "s7-koulu");
    // Same reasoning as s6: possibleSchools = {A,B,C} ∩ [A,D] ∩ (not in
    // [B,C]) = {A}.
    expect(await getMultiSelectOptions(page, "schools")).toEqual([A]);
    await selectSchools(page, [A]);

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await fillWilmaFields(page, "s7-v2.inschool.fi");
    await saveIntegration(page);
  });
});

test.describe("koulunvalinta - vanha saman oppilaitostyypin integraatio, ei tallennu (s8-s9)", () => {
  test("s8: sibling schools=[A,B,C,D] (kaikki mukana) - luonti ok, ei anna tallentaa", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A, B, C, D],
    });
    // -> eSI=[A,B,C,D] (all four - sibling's own include-list), eSE=null.

    // createNewIdpIntegrationHere() - see the identical comment in the s1
    // test above for why createNewIdpIntegration()'s goto("/") can't be used
    // here.
    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "s8.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    // analyseExistingInclude's "(eSI.length>0 and eSE null)" branch
    // (SchoolSelection.tsx:475-490) filters possibleSchools down to schools
    // NOT already in eSI - since eSI already covers all three Peruskoulut
    // schools (A,B,C), possibleSchools becomes empty. With nothing left to
    // pick, isExtraSchoolConfigurationOk()'s final
    // `(currentExcludeSchools.length>0||discoveryInformation.schools.length>0)`
    // clause can never be satisfied (SchoolSelection.tsx:261-266), so
    // saveCheck() (SchoolSelection.tsx:295-307) never enables "Tallenna" -
    // deliberately NOT calling selectSchools/selectExcludedSchools here.
    await fillCommonIdpSteps(page, "s8-koulu");

    // possibleSchools.current is empty (mandatoryinstitutionTypesText,
    // SchoolSelection.tsx:859-874) - "Oppilaitostyypit"-kentän helperText
    // näyttää tämän varoituksen aina kun jäljellä ei ole yhtään valittavaa
    // koulua kyseiselle oppilaitostyypille.
    await expect(
      page.getByText("Kaikki koulut ovat jo käytössä muissa integraatioissa")
    ).toBeVisible();
    // Confirmed against a real run: unlike s9/s10, mandatoryExtraSchool
    // Configuration() (SchoolSelection.tsx:389-409) turns extraSchoolsConfig-
    // uration itself OFF whenever possibleSchools.current is empty (its
    // "other existing configuration" branch only re-enables the switch if
    // there's actually something left to pick) - so "schools"/"excludedSch-
    // ools" aren't just empty here, they're not rendered at all. Nothing to
    // assert about their dropdown contents; the "Kaikki koulut..." warning
    // above and the disabled "Tallenna" below are the only observable state.
    await expect(page.getByRole("button", { name: "Tallenna" })).toBeDisabled();
  });

  test("s9: sibling schools=[A] - luonti ok, muokkaus nok (mock-rajoitus)", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A],
    });
    // -> eSI=[A], eSE=null.

    // createNewIdpIntegrationHere() - see the identical comment in the s1
    // test above for why createNewIdpIntegration()'s goto("/") can't be used
    // here.
    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "s9.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    await fillCommonIdpSteps(page, "s9-koulu");
    // Unlike s8, eSI only claims A - possibleSchools becomes [B,C], so the
    // "all schools already used" warning must NOT appear here.
    await expect(
      page.getByText("Kaikki koulut ovat jo käytössä muissa integraatioissa")
    ).not.toBeVisible();
    expect((await getMultiSelectOptions(page, "schools")).sort()).toEqual(
      [B, C].sort()
    );
    // Same eSE===null situation as s8 - "excludedSchools" is also rendered,
    // offering every Peruskoulut school regardless of eSI.
    expect((await getMultiSelectOptions(page, "excludedSchools")).sort()).toEqual(
      [A, B, C].sort()
    );
    // picking one of them in "schools" satisfies
    // isExtraSchoolConfigurationOk() and "Tallenna" enables.
    await selectSchools(page, [B]);

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    // Confirmed against a real run: re-opening this same integration for
    // edit does NOT re-enable "Tallenna" even without changing anything
    // further, matching the given matrix exactly.
    await openEditFromViewPage(page);
    await expect(page.getByRole("button", { name: "Tallenna" })).toBeDisabled();
  });
});

test.describe("koulunvalinta - vanha saman oppilaitostyypin integraatio (s10)", () => {
  test("s10: sibling schools=[A,D] - tyhjänä ei tallennu, koulun valinnan jälkeen luonti ja muokkaus ok", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [A, D],
    });
    // -> eSI=[A,D] (D is filtered out of our Peruskoulut-only view further
    // down, but still counts towards eSI's raw contents), eSE=null.

    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "s10.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    await fillCommonIdpSteps(page, "s10-koulu");

    // "tyhjän luonti ei lisää includeja excludeen" - leaving schools/
    // excludedSchools untouched (the naive/default path) fails, same
    // mechanism as s8/s9's basic case (isExtraSchoolConfigurationOk()'s final
    // clause needs a non-empty pick regardless of eSI/eSE).
    await expect(page.getByRole("button", { name: "Tallenna" })).toBeDisabled();
    // Unlike s8, eSI=[A,D] only removes A from the Peruskoulut set (D isn't
    // in it to begin with), leaving possibleSchools=[B,C] - the "all schools
    // already used" warning must NOT appear.
    await expect(
      page.getByText("Kaikki koulut ovat jo käytössä muissa integraatioissa")
    ).not.toBeVisible();
    expect((await getMultiSelectOptions(page, "schools")).sort()).toEqual(
      [B, C].sort()
    );
    // Same eSE===null situation as s8/s9 - "excludedSchools" is also
    // rendered, offering every Peruskoulut school regardless of eSI.
    expect((await getMultiSelectOptions(page, "excludedSchools")).sort()).toEqual(
      [A, B, C].sort()
    );

    // Per the given matrix, muokkaus is "ok", which requires the integration
    // to actually get saved at some point to have something to edit. Unlike
    // s9 (eSI=[A], one item), analyseExistingInclude's "(eSI.length>0 and eSE
    // null)" branch (SchoolSelection.tsx:475-490) here filters out only A
    // (D isn't in the Peruskoulut-filtered base set to begin with), leaving
    // possibleSchools={B,C} - B should be a valid "schools" pick by the same
    // reasoning as s9. I could not find a code-level reason distinguishing
    // s10 from s9 enough to explain "luonti nok" as anything stronger than
    // the empty-path case just asserted above - please tell me if this next
    // assertion (picking B enables saving) turns out wrong.
    await selectSchools(page, [B]);
    await expect(page.getByRole("button", { name: "Tallenna" })).toBeEnabled();
    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await fillWilmaFields(page, "s10-v2.inschool.fi");
    await saveIntegration(page);
  });
});

test.describe("koulunvalinta - vanha oppilaitostyyppien setti, vähintään yksi yhteinen (m-sarja, uusi = molemmat tyypit)", () => {
  // See the file-level comment block above for why every scenario here is
  // expected "ok" regardless of eSI/eSE, including m8-m10 (mirrored from
  // s8-s10 per earlier instruction, but the multi-institutionType branch
  // structurally can't reproduce their "nok" outcomes).
  const singleSiblingScenarios: {
    name: string;
    schools?: string[];
    excludedSchools?: string[];
  }[] = [
    { name: "m1", excludedSchools: [A, B, C, D] },
    { name: "m2", excludedSchools: [A, B, C] },
    { name: "m3", excludedSchools: [A, B] },
    { name: "m4", excludedSchools: [A] },
    { name: "m5", excludedSchools: [A, D] },
    { name: "m8", schools: [A, B, C, D] },
    { name: "m9", schools: [A] },
    { name: "m10", schools: [A, D] },
    { name: "m11", schools: [] },
  ];

  for (const scenario of singleSiblingScenarios) {
    test(`${scenario.name}: yksi sibling - luonti ja muokkaus ok (moniooppilaitostyyppinen, eSI/eSE ei rajoita)`, async ({
      page,
    }) => {
      await mockInstitutionTypes(page);
      logBrowserConsole(page);

      await createSiblingIdpIntegration(page, {
        institutionTypeLabels: [PERUSKOULUT, LUKIOT],
        schools: scenario.schools,
        excludedSchools: scenario.excludedSchools,
      });

      await createNewIdpIntegrationHere(page, "Wilma");
      await fillWilmaFields(page, `${scenario.name}.inschool.fi`);
      await selectEnvironment(page, "Tuotanto");
      await fillCommonIdpSteps(page, `${scenario.name}-koulu`);
      await selectInstitutionTypes(page, [LUKIOT]);
      // updateExtraSchoolsConfigurationData's institutionTypeList.length>1
      // override (SchoolSelection.tsx:593-596) always offers every school of
      // our chosen types regardless of eSI/eSE, and
      // isExtraSchoolConfigurationOk()'s multi-type branch
      // (SchoolSelection.tsx:270-275) only needs a non-empty pick - A is
      // always valid here. Same override means possibleSchools.current is
      // never empty for the m-series (unlike s8), so the "all schools
      // already used" warning must never appear here either - notably m8
      // reuses s8's exact sibling schools=[A,B,C,D] yet still shouldn't show
      // it.
      await expect(
        page.getByText("Kaikki koulut ovat jo käytössä muissa integraatioissa")
      ).not.toBeVisible();
      // Both "schools" and "excludedSchools" (still rendered together here,
      // before either one has a pick) must offer every school of both chosen
      // types - the multi-type override ignores eSI/eSE entirely.
      expect((await getMultiSelectOptions(page, "schools")).sort()).toEqual(
        [A, B, C, D].sort()
      );
      expect((await getMultiSelectOptions(page, "excludedSchools")).sort()).toEqual(
        [A, B, C, D].sort()
      );
      await selectSchools(page, [A]);
      // Sibling exists -> Alert should show for every one of these scenarios,
      // see ADMIN_CONFIG_NOTICE's definition above.
      await expect(page.getByText(ADMIN_CONFIG_NOTICE)).toBeVisible();

      await saveIntegration(page);
      await expect(page).toHaveURL(/\/integraatio\/\d+/);

      await openEditFromViewPage(page);
      await fillWilmaFields(page, `${scenario.name}-v2.inschool.fi`);
      await saveIntegration(page);
    });
  }

  test("m6: sibling schools=[B] + excludedSchools=[A,D] (kaksi siblingiä) - luonti ja muokkaus ok", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [B],
    });
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      excludedSchools: [A, D],
      alreadyHome: true,
    });
    // -> eSI=[B], eSE=[A,D] - irrelevant for the multi-type branch, see the
    // file-level comment.

    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "m6.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    await fillCommonIdpSteps(page, "m6-koulu");
    await selectInstitutionTypes(page, [LUKIOT]);
    // Same multi-type override as the loop above - eSI/eSE don't restrict.
    expect((await getMultiSelectOptions(page, "schools")).sort()).toEqual(
      [A, B, C, D].sort()
    );
    expect((await getMultiSelectOptions(page, "excludedSchools")).sort()).toEqual(
      [A, B, C, D].sort()
    );
    await selectSchools(page, [A]);
    await expect(page.getByText(ADMIN_CONFIG_NOTICE)).toBeVisible();

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await fillWilmaFields(page, "m6-v2.inschool.fi");
    await saveIntegration(page);
  });

  test("m7: sibling schools=[B,C] + excludedSchools=[A,D] (kaksi siblingiä) - luonti ja muokkaus ok", async ({
    page,
  }) => {
    await mockInstitutionTypes(page);
    logBrowserConsole(page);

    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      schools: [B, C],
    });
    await createSiblingIdpIntegration(page, {
      institutionTypeLabels: [PERUSKOULUT, LUKIOT],
      excludedSchools: [A, D],
      alreadyHome: true,
    });
    // -> eSI=[B,C], eSE=[A,D] - irrelevant for the multi-type branch, see the
    // file-level comment.

    await createNewIdpIntegrationHere(page, "Wilma");
    await fillWilmaFields(page, "m7.inschool.fi");
    await selectEnvironment(page, "Tuotanto");
    await fillCommonIdpSteps(page, "m7-koulu");
    await selectInstitutionTypes(page, [LUKIOT]);
    // Same multi-type override as the loop above - eSI/eSE don't restrict.
    expect((await getMultiSelectOptions(page, "schools")).sort()).toEqual(
      [A, B, C, D].sort()
    );
    expect((await getMultiSelectOptions(page, "excludedSchools")).sort()).toEqual(
      [A, B, C, D].sort()
    );
    await selectSchools(page, [A]);
    await expect(page.getByText(ADMIN_CONFIG_NOTICE)).toBeVisible();

    await saveIntegration(page);
    await expect(page).toHaveURL(/\/integraatio\/\d+/);

    await openEditFromViewPage(page);
    await fillWilmaFields(page, "m7-v2.inschool.fi");
    await saveIntegration(page);
  });
});
