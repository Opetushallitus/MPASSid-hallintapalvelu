import { describe, expect, it } from "vitest";
import {
  analyseExistingExclude,
  analyseExistingInclude,
  extraSchoolConfigurationDefault,
  isExtraSchoolConfigurationOk,
  keepOfferedSchools,
  keepSchoolsOfTypes,
  keepOrganisationSchools,
  parseInstitutionType,
  schoolOptions,
  validateSchoolSelection,
  type ExcludeAnalysis,
  type ExtraSchoolConfigurationInput,
  type SchoolSelectionValidityInput,
  type SchoolType,
} from "./schoolRules";

// Fixture: three schools of type 11 (peruskoulu) and one of type 15 (lukio).
// Lowercase names for the codes keep the tables readable.
const a = "30001";
const b = "30002";
const c = "30003";
const l = "30077";
const SCHOOLS: SchoolType[] = [
  { nimi: "Koulu A", oppilaitostyyppi: 11, koulukoodi: a },
  { nimi: "Koulu B", oppilaitostyyppi: 11, koulukoodi: b },
  { nimi: "Koulu C", oppilaitostyyppi: 11, koulukoodi: c },
  { nimi: "Lukio L", oppilaitostyyppi: 15, koulukoodi: l },
];
const codes = (options: { value: string }[]) => options.map((o) => o.value);

describe("parseInstitutionType", () => {
  it.each([
    ["oppilaitostyyppi_11#1", 11],
    ["oppilaitostyyppi_15#2", 15],
    ["", 0],
    [undefined, 0],
    [null, 0],
  ])("%s -> %s", (value, expected) => {
    expect(parseInstitutionType(value)).toBe(expected);
  });
});

describe("schoolOptions / keepOrganisationSchools / keepOfferedSchools", () => {
  it("rajaa koulut oppilaitostyyppien mukaan", () => {
    expect(schoolOptions(SCHOOLS, [11])).toEqual([
      { label: "Koulu A", value: a },
      { label: "Koulu B", value: b },
      { label: "Koulu C", value: c },
    ]);
    expect(codes(schoolOptions(SCHOOLS, [11, 15]))).toEqual([a, b, c, l]);
    expect(schoolOptions(SCHOOLS, [])).toEqual([]);
  });

  it("säilyttää vain organisaation koulut ja vain tarjotut koulut", () => {
    expect(keepOrganisationSchools([a, "99999", l], SCHOOLS)).toEqual([a, l]);
    expect(keepOfferedSchools([a, b, l], schoolOptions(SCHOOLS, [11]))).toEqual([a, b]);
  });
});

describe("analyseExistingInclude (yksi oppilaitostyyppi: peruskoulut)", () => {
  // eSI/eSE = saman organisaation muiden tuotantointegraatioiden schools /
  // excludedSchools. "originals" = muokattavan integraation omat koulut.
  it.each([
    // eSI,   eSE,      originals, options,     showAllSchools, constrained
    [null, null, [], [a, b, c], false, false],
    [[], null, [], [], false, true], // "ei mahdollinen"
    [[], [], [b], [b], false, true], // "ei mahdollinen": vain omat
    [[], [], [], [], false, true],
    [[], [b, c], [], [b, c], false, true], // vain toisen poissulkemat
    [[], [b], [a], [a, b], false, true], // + omat alkuperäiset
    [[a], null, [], [b, c], true, true], // A on jo muualla
    [[a], null, [a], [a, b, c], true, true], // oma A säilyy
    [[a], [b, c], [], [b, c], true, true],
    [[a], [a, b], [], [b], true, true],
    // eSE=[] -> ei mitään; backend ei palauta eSE=[] (2026-10-13), joten ennallaan.
    [[a], [], [], [], true, true],
  ] as const)(
    "eSI=%j eSE=%j originals=%j -> %j",
    (eSI, eSE, originals, expected, showAllSchools, constrained) => {
      const result = analyseExistingInclude({
        institutionTypes: [11],
        existingIncluded: eSI === null ? null : [...eSI],
        existingExcluded: eSE === null ? null : [...eSE],
        allSchools: SCHOOLS,
        originalSchools: [...originals],
      });
      expect(codes(result.options)).toEqual(expected);
      expect(result.showAllSchools).toBe(showAllSchools);
      expect(result.extraSchoolConfigurationNeeded).toBe(constrained);
      expect(result.disableExtraSchoolConfigurationSwitch).toBe(constrained);
    }
  );

  it("useampi tyyppi ilman muita integraatioita: kaikkien tyyppien koulut", () => {
    const result = analyseExistingInclude({
      institutionTypes: [11, 15],
      existingIncluded: null,
      existingExcluded: null,
      allSchools: SCHOOLS,
      originalSchools: [],
    });
    expect(codes(result.options)).toEqual([a, b, c, l]);
  });

  it("ei muuta syötteitä", () => {
    const eSI = Object.freeze([a]) as unknown as string[];
    const originals = Object.freeze([b]) as unknown as string[];
    expect(() =>
      analyseExistingInclude({
        institutionTypes: [11],
        existingIncluded: eSI,
        existingExcluded: null,
        allSchools: Object.freeze([...SCHOOLS]) as unknown as SchoolType[],
        originalSchools: originals,
      })
    ).not.toThrow();
  });
});

describe("analyseExistingExclude", () => {
  const run = (
    institutionTypeCount: number,
    eSI: string[] | null,
    eSE: string[] | null,
    oldIntegration = false,
    originalExcludedSchools: string[] = []
  ) =>
    analyseExistingExclude({
      oldIntegration,
      institutionTypeCount,
      existingIncluded: eSI,
      existingExcluded: eSE,
      originalExcludedSchools,
    });

  it.each<[string, ExcludeAnalysis, ExcludeAnalysis]>([
    [
      "useampi tyyppi, eSI=[A], eSE=[]: ei admin-ilmoitusta",
      run(2, [a], []),
      { hideExcludeSchools: false, adminConfiguration: false, extraSchoolConfigurationNeeded: true, disableExtraSchoolConfigurationSwitch: true },
    ],
    [
      "useampi tyyppi, eSI=[A], eSE=[B]: admin-ilmoitus",
      run(2, [a], [b]),
      { hideExcludeSchools: false, adminConfiguration: true, extraSchoolConfigurationNeeded: true, disableExtraSchoolConfigurationSwitch: true },
    ],
    [
      "useampi tyyppi, eSI=null, eSE=[]: admin-ilmoitus",
      run(2, null, []),
      { hideExcludeSchools: false, adminConfiguration: true, extraSchoolConfigurationNeeded: true, disableExtraSchoolConfigurationSwitch: true },
    ],
    [
      "yksi tyyppi, uusi integraatio, toinen sulkee pois: poissulkukenttä piiloon",
      run(1, [], [b]),
      { hideExcludeSchools: true, adminConfiguration: false, extraSchoolConfigurationNeeded: false, disableExtraSchoolConfigurationSwitch: true },
    ],
    [
      "yksi tyyppi, muokkaus ilman omia poissulkuja: piiloon",
      run(1, [], [b], true, []),
      { hideExcludeSchools: true, adminConfiguration: false, extraSchoolConfigurationNeeded: false, disableExtraSchoolConfigurationSwitch: true },
    ],
    [
      "yksi tyyppi, muokkaus omilla poissuluilla: kenttä näkyy",
      run(1, [], [b], true, [c]),
      { hideExcludeSchools: false, adminConfiguration: false, extraSchoolConfigurationNeeded: false, disableExtraSchoolConfigurationSwitch: true },
    ],
    [
      "yksi tyyppi, eSE=[]: kenttä näkyy",
      run(1, [a], []),
      { hideExcludeSchools: false, adminConfiguration: false, extraSchoolConfigurationNeeded: false, disableExtraSchoolConfigurationSwitch: true },
    ],
    [
      // eSE=null -> aina admin-ilmoitus useammalla tyypillä; näytetään vain, kun sisar on olemassa.
      "useampi tyyppi, eSE=null: admin aina, extraNeeded ennallaan",
      run(2, [a], null),
      { hideExcludeSchools: false, adminConfiguration: true, extraSchoolConfigurationNeeded: undefined, disableExtraSchoolConfigurationSwitch: false },
    ],
    [
      "yksi tyyppi, eSE=null: admin ja extraNeeded ennallaan",
      run(1, null, null),
      { hideExcludeSchools: false, adminConfiguration: undefined, extraSchoolConfigurationNeeded: undefined, disableExtraSchoolConfigurationSwitch: false },
    ],
  ])("%s", (_name, actual, expected) => {
    expect(actual).toEqual(expected);
  });
});

describe("extraSchoolConfigurationDefault", () => {
  it.each([
    ["omat koulut", [a], [], null, null, 0, true],
    ["omat poissulut", [], [a], null, null, 0, true],
    ["ei omia eikä muita integraatioita", [], [], null, null, 3, false],
    ["muita integraatioita ja kouluja tarjolla", [], [], [a], null, 2, true],
    ["muita integraatioita, ei kouluja tarjolla", [], [], [], [b], 0, false],
  ] as const)(
    "%s",
    (_name, schools, excludedSchools, eSI, eSE, possibleSchoolCount, expected) => {
      expect(
        extraSchoolConfigurationDefault({
          schools: [...schools],
          excludedSchools: [...excludedSchools],
          existingIncluded: eSI === null ? null : [...eSI],
          existingExcluded: eSE === null ? null : [...eSE],
          possibleSchoolCount,
        })
      ).toBe(expected);
    }
  );
});

describe("isExtraSchoolConfigurationOk", () => {
  const base: ExtraSchoolConfigurationInput = {
    possibleSchoolCount: 3,
    extraSchoolConfigurationNeeded: true,
    institutionTypeCount: 1,
    hasConfigurationEntity: true,
    existingIncluded: null,
    existingExcluded: null,
    showSchools: true,
    schools: [],
    excludedSchools: [],
    currentExcludeSchools: [],
  };

  it.each<[string, Partial<ExtraSchoolConfigurationInput>, boolean]>([
    ["ei tarjolla olevia kouluja", { possibleSchoolCount: 0, schools: [b] }, false],
    ["säännöt eivät pakollisia, taulukot olemassa", { extraSchoolConfigurationNeeded: false }, true],
    // Puuttuva taulukko tulkitaan virheeksi; backend lähettää ne aina (2026-10-13).
    ["säännöt eivät pakollisia, schools puuttuu", { extraSchoolConfigurationNeeded: false, schools: undefined }, false],
    ["säännöt pakollisia, ei omaa valintaa", {}, false],
    ["säännöt pakollisia, oma koulu", { schools: [b] }, true],
    ["säännöt pakollisia, oma poissulku", { currentExcludeSchools: [b] }, true],
    ["koulunäkymä pois", { schools: [b], showSchools: false }, false],
    ["ei oppilaitostyyppejä", { schools: [b], institutionTypeCount: 0 }, false],
    ["oppilaitostyypit puuttuvat", { schools: [b], institutionTypeCount: undefined }, false],
    ["ei configurationEntityä", { schools: [b], hasConfigurationEntity: false }, false],
    [
      "toinen sisältää kaikki koulut -> poissulku ei sallittu",
      { existingIncluded: [], excludedSchools: [b], currentExcludeSchools: [b] },
      false,
    ],
    ["toinen sulkee pois B,C -> B sallittu", { existingExcluded: [b, c], schools: [b] }, true],
    ["toinen sulkee pois B,C -> A ei sallittu", { existingExcluded: [b, c], schools: [a] }, false],
    ["toinen sisältää A -> A ei sallittu", { existingIncluded: [a], schools: [a] }, false],
    ["toinen sisältää A -> B sallittu", { existingIncluded: [a], schools: [b] }, true],
    [
      "useampi tyyppi: muiden integraatioiden kouluja ei tarkisteta",
      { institutionTypeCount: 2, existingIncluded: [a], schools: [a] },
      true,
    ],
  ])("%s", (_name, overrides, expected) => {
    expect(isExtraSchoolConfigurationOk({ ...base, ...overrides })).toBe(expected);
  });
});

describe("validateSchoolSelection", () => {
  // School view on, rules not mandatory, one type, arrays normalized: valid.
  const base: SchoolSelectionValidityInput = {
    notAllowedSchoolCount: 0,
    draftHasIdp: true,
    showSchoolsSwitch: true,
    possibleSchoolCount: 3,
    extraSchoolConfigurationNeeded: false,
    institutionTypeCount: 1,
    hasConfigurationEntity: true,
    existingIncluded: null,
    existingExcluded: null,
    showSchools: true,
    schools: [],
    excludedSchools: [],
    currentExcludeSchools: [],
  };

  it.each<[string, Partial<SchoolSelectionValidityInput>, boolean]>([
    ["perustapaus", {}, true],
    ["koulunäkymä päällä, ei oppilaitostyyppejä", { institutionTypeCount: 0 }, false],
    ["koulunäkymä päällä, oppilaitostyypit puuttuvat", { institutionTypeCount: undefined }, false],
    ["koulunäkymä päällä, ei tarjolla olevia kouluja", { possibleSchoolCount: 0 }, false],
    [
      "koulunäkymä pois: tyypeillä ja kouluilla ei väliä",
      { showSchoolsSwitch: false, institutionTypeCount: 0, possibleSchoolCount: 0 },
      true,
    ],
    ["luonnoksella ei idp:tä", { draftHasIdp: false }, false],
    ["säännöt pakollisia, ei omaa valintaa", { extraSchoolConfigurationNeeded: true }, false],
    ["säännöt pakollisia, oma koulu", { extraSchoolConfigurationNeeded: true, schools: [b] }, true],
    ["oma koulu ei sallittu Tuotannossa", { notAllowedSchoolCount: 1 }, false],
    [
      "koulunäkymä pois: ei-sallituilla kouluilla ei väliä",
      { showSchoolsSwitch: false, notAllowedSchoolCount: 1 },
      true,
    ],
  ])("%s", (_name, overrides, expected) => {
    expect(validateSchoolSelection({ ...base, ...overrides })).toBe(expected);
  });

  // The rule with the logo and environment rules included (as SchoolSelection
  // once had them): with the parent's logo requirement (logoOK, ANDed into
  // canSave) the result the user sees is the same.
  type LegacyInput = SchoolSelectionValidityInput & {
    hasLogo: boolean;
    environment: number;
    originalEnvironment: number;
  };
  const legacyCanSave = (input: LegacyInput): boolean => {
    const { hasLogo, environment, originalEnvironment, schools, excludedSchools } = input;
    const institutionTypeCount = input.institutionTypeCount ?? 0;
    if (input.showSchoolsSwitch && (institutionTypeCount === 0 || input.possibleSchoolCount === 0)) {
      return false;
    }
    if (hasLogo) {
      return (
        !input.showSchoolsSwitch ||
        (isExtraSchoolConfigurationOk(input) && input.draftHasIdp && institutionTypeCount > 0)
      );
    }
    if (environment === originalEnvironment || originalEnvironment === -5) {
      return false;
    }
    return !(institutionTypeCount > 1 && schools?.length === 0 && excludedSchools?.length === 0);
  };

  it("vastaa logo- ja ympäristösäännöt sisältävää sääntöä, kun vanhemman logovaatimus otetaan huomioon", () => {
    // Small deterministic PRNG, so a failure is reproducible.
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const oneOf = <T,>(values: T[]): T => values[Math.floor(random() * values.length)];
    const codes = [a, b, c];
    const someCodes = () => codes.filter(() => random() < 0.4);
    const maybeList = () => oneOf([null, [], someCodes()]);

    Array.from({ length: 20000 }).forEach(() => {
      // notAllowedSchoolCount is newer than the legacy rule (it only adds a
      // reason to block), so the comparison covers inputs without it.
      const input: LegacyInput = {
        notAllowedSchoolCount: 0,
        draftHasIdp: random() < 0.9,
        showSchoolsSwitch: random() < 0.7,
        possibleSchoolCount: oneOf([0, 1, 3]),
        extraSchoolConfigurationNeeded: random() < 0.5,
        institutionTypeCount: oneOf([undefined, 0, 1, 2]),
        hasConfigurationEntity: random() < 0.9,
        existingIncluded: maybeList(),
        existingExcluded: maybeList(),
        showSchools: oneOf([undefined, false, true]),
        schools: oneOf([undefined, someCodes()]),
        excludedSchools: oneOf([undefined, someCodes()]),
        currentExcludeSchools: someCodes(),
        hasLogo: random() < 0.5,
        environment: oneOf([0, 1, 2]),
        originalEnvironment: oneOf([-5, 0, 1, 2]),
      };
      const before = legacyCanSave(input) && input.hasLogo;
      const after = validateSchoolSelection(input) && input.hasLogo;
      if (before !== after) {
        expect(input).toBe("sama tulos kuin ennen");
      }
    });
  });
});

describe("keepSchoolsOfTypes", () => {
  const all: SchoolType[] = [
    { nimi: "A", oppilaitostyyppi: 11, koulukoodi: a },
    { nimi: "B", oppilaitostyyppi: 11, koulukoodi: b },
    { nimi: "L", oppilaitostyyppi: 15, koulukoodi: "30077" },
  ];

  it.each<[string, string[], number[], string[]]>([
    ["kaikki tyypit valittuna", [a, "30077"], [11, 15], [a, "30077"]],
    ["lukiot pois", [a, "30077"], [11], [a]],
    ["peruskoulut pois", [a, b, "30077"], [15], ["30077"]],
    ["ei tyyppejä", [a], [], []],
    ["tuntematon koulu karsitaan", ["99999"], [11, 15], []],
  ])("%s", (_name, codes, types, expected) => {
    expect(keepSchoolsOfTypes(codes, all, types)).toEqual(expected);
  });
});
