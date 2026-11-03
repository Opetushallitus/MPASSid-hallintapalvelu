/**
 * Pure school selection rules. No React, no refs, no mutation of inputs:
 * SchoolSelection.tsx calls these and applies the results to its state.
 *
 * Oddities that the backend's data never triggers are marked with `Note:`
 * comments.
 *
 * Terms:
 *  - eSI / existingIncluded: schools that OTHER production integrations of
 *    the same organisation (sharing an institution type) include; null when
 *    no such integration has schools configured.
 *  - eSE / existingExcluded: the same for excludedSchools.
 */
import type { oneEnum } from "../Form/MultiSelectForm";

/** One school of the organisation (from organisaatio children). */
export interface SchoolType {
  nimi: string;
  oppilaitostyyppi: number;
  koulukoodi: string;
}

/**
 * Institution type number from an organisaatio child's oppilaitostyyppi
 * ("oppilaitostyyppi_11#1" -> 11). Empty/missing -> 0.
 */
export const parseInstitutionType = (value?: string | null): number => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  return Number(value.substring(17).split("#")[0]);
};

/** A school as a select option. */
export const toOption = (school: SchoolType): oneEnum => ({
  label: school.nimi,
  value: String(school.koulukoodi),
});

/** Select options for the schools of the given institution types. */
export const schoolOptions = (
  schools: SchoolType[],
  institutionTypes: number[]
): oneEnum[] =>
  schools
    .filter((school) => institutionTypes.indexOf(school.oppilaitostyyppi) > -1)
    .map(toOption);

/** Keeps only the codes that are schools of the organisation. */
export const keepOrganisationSchools = (
  codes: string[],
  schools: SchoolType[]
): string[] => {
  const organisationCodes = schools.map((school) => school.koulukoodi);
  return codes.filter((code) => organisationCodes.indexOf(code) >= 0);
};

/** Keeps only the codes that are schools of the given institution types. */
export const keepSchoolsOfTypes = (
  codes: string[],
  schools: SchoolType[],
  institutionTypes: number[]
): string[] =>
  codes.filter((code) =>
    schools.some(
      (school) =>
        school.koulukoodi === code && institutionTypes.indexOf(school.oppilaitostyyppi) > -1
    )
  );

/** Keeps only the codes that are offered as options. */
export const keepOfferedSchools = (codes: string[], options: oneEnum[]): string[] => {
  const offered = options.map((option) => option.value);
  return codes.filter((code) => offered.indexOf(code) >= 0);
};

// ---------------------------------------------------------------------------
// analyseExistingInclude
// ---------------------------------------------------------------------------

export interface IncludeAnalysisInput {
  institutionTypes: number[];
  existingIncluded: string[] | null;
  existingExcluded: string[] | null;
  allSchools: SchoolType[];
  /** The integration's own schools when it was opened (originalSchoolsRef). */
  originalSchools: string[];
}

export interface IncludeAnalysis {
  /** Schools that may be INCLUDED (the "schools" select). */
  options: oneEnum[];
  /** Offer every school of the types in the "excludedSchools" select. */
  showAllSchools: boolean;
  extraSchoolConfigurationNeeded: boolean;
  disableExtraSchoolConfigurationSwitch: boolean;
}

/**
 * Which schools this integration may include, given what the organisation's
 * other production integrations already include/exclude. The integration's
 * own original schools stay selectable when it is edited.
 */
export const analyseExistingInclude = ({
  institutionTypes,
  existingIncluded: eSI,
  existingExcluded: eSE,
  allSchools,
  originalSchools,
}: IncludeAnalysisInput): IncludeAnalysis => {
  const ofTypes = allSchools.filter(
    (school) => institutionTypes.indexOf(school.oppilaitostyyppi) > -1
  );
  const code = (school: SchoolType) => String(school.koulukoodi);
  const isOriginal = (school: SchoolType) => originalSchools.indexOf(code(school)) > -1;

  if (eSI === null) {
    // No other integration has schools -> every school of the types.
    // (eSI == null implies eSE == null.)
    return {
      options: ofTypes.map(toOption),
      showAllSchools: false,
      extraSchoolConfigurationNeeded: false,
      disableExtraSchoolConfigurationSwitch: false,
    };
  }

  const constrained = (options: oneEnum[], showAllSchools: boolean): IncludeAnalysis => ({
    options,
    showAllSchools,
    extraSchoolConfigurationNeeded: true,
    disableExtraSchoolConfigurationSwitch: true,
  });

  if (eSI.length === 0) {
    if (eSE === null) {
      // "Not possible" (eSI = [] and eSE == null).
      return constrained([], false);
    }
    // Another integration excludes eSE: only those schools (plus this
    // integration's own originals) can still be added.
    // eSE = [] together with eSI = [] is "not possible" per the original
    // comments; it then allows only the originals.
    const allowed = [...new Set([...eSE, ...originalSchools])];
    return constrained(
      ofTypes.filter((school) => allowed.indexOf(code(school)) > -1).map(toOption),
      false
    );
  }

  // eSI.length > 0: other integrations include eSI -> those cannot be added
  // again (unless they are this integration's own originals).
  const notIncludedElsewhere = (school: SchoolType) =>
    eSI.indexOf(code(school)) < 0 || isOriginal(school);

  if (eSE === null) {
    return constrained(ofTypes.filter(notIncludedElsewhere).map(toOption), true);
  }

  // Note: with eSE = [] this would offer NOTHING (only schools in eSE pass the
  // first filter). Unreachable: the backend returns null, never [], when no
  // other integration excludes schools (confirmed 2026-10-13), so it is kept.
  return constrained(
    ofTypes
      .filter((school) => eSE.indexOf(code(school)) > -1)
      .filter(notIncludedElsewhere)
      .map(toOption),
    true
  );
};

// ---------------------------------------------------------------------------
// analyseExistingExclude
// ---------------------------------------------------------------------------

export interface ExcludeAnalysisInput {
  /** An existing integration (id > 0) is being edited. */
  oldIntegration: boolean;
  institutionTypeCount: number;
  existingIncluded: string[] | null;
  existingExcluded: string[] | null;
  /** The integration's own excludedSchools when it was opened. */
  originalExcludedSchools: string[];
}

export interface ExcludeAnalysis {
  hideExcludeSchools: boolean;
  /** undefined: leave adminConfiguration as it is. */
  adminConfiguration: boolean | undefined;
  /** undefined: leave extraSchoolConfigurationNeeded as it is. */
  extraSchoolConfigurationNeeded: boolean | undefined;
  disableExtraSchoolConfigurationSwitch: boolean;
}

/**
 * Whether the "excludedSchools" select is shown and whether the
 * multi-type "admin configuration" notice applies.
 *
 * Note: SchoolSelection applies this BEFORE analyseExistingInclude, whose
 * extraSchoolConfigurationNeeded / disableExtraSchoolConfigurationSwitch then
 * override the ones returned here.
 */
export const analyseExistingExclude = ({
  oldIntegration,
  institutionTypeCount,
  existingIncluded: eSI,
  existingExcluded: eSE,
  originalExcludedSchools,
}: ExcludeAnalysisInput): ExcludeAnalysis => {
  if (eSE !== null) {
    if (institutionTypeCount > 1) {
      return {
        hideExcludeSchools: false,
        adminConfiguration: !(eSI !== null && eSI.length > 0 && eSE.length === 0),
        extraSchoolConfigurationNeeded: true,
        disableExtraSchoolConfigurationSwitch: true,
      };
    }
    // One institution type: another integration already excludes schools,
    // so a new integration may only include. An edited integration that
    // already had its own exclusions keeps the field.
    const hideExcludeSchools =
      eSE.length > 0 && (!oldIntegration || originalExcludedSchools.length === 0);
    return {
      hideExcludeSchools,
      adminConfiguration: false,
      extraSchoolConfigurationNeeded: false,
      disableExtraSchoolConfigurationSwitch: true,
    };
  }

  // eSE == null.
  return {
    hideExcludeSchools: false,
    // Note: the original `eSE?.length === 0` check can never be true here (eSE
    // is null), so with several types this is always true. That is
    // consistent: the notice is shown only when some other integration has a
    // configuration (SchoolSelection's noExistingSchoolConfigurations), and
    // the eSE !== null branch is also always true as eSE is never [].
    adminConfiguration: institutionTypeCount > 1 ? true : undefined,
    extraSchoolConfigurationNeeded: undefined,
    disableExtraSchoolConfigurationSwitch: false,
  };
};

// ---------------------------------------------------------------------------
// mandatoryExtraSchoolConfiguration
// ---------------------------------------------------------------------------

/**
 * Whether the "Lisää kouluvalinta säännöt" switch is turned on after loading
 * the other integrations' configuration. possibleSchoolCount is the count of
 * the options just computed for this load (not the previous round's).
 */
export const extraSchoolConfigurationDefault = ({
  schools,
  excludedSchools,
  existingIncluded,
  existingExcluded,
  possibleSchoolCount,
}: {
  schools: string[];
  excludedSchools: string[];
  existingIncluded: string[] | null;
  existingExcluded: string[] | null;
  possibleSchoolCount: number;
}): boolean => {
  if (schools.length > 0 || excludedSchools.length > 0) {
    return true;
  }
  if (existingIncluded === null && existingExcluded === null) {
    return false;
  }
  return possibleSchoolCount > 0;
};

// ---------------------------------------------------------------------------
// isExtraSchoolConfigurationOk
// ---------------------------------------------------------------------------

export interface ExtraSchoolConfigurationInput {
  possibleSchoolCount: number;
  extraSchoolConfigurationNeeded: boolean;
  /** configurationEntity.idp.institutionTypes?.length (undefined if missing). */
  institutionTypeCount: number | undefined;
  hasConfigurationEntity: boolean;
  existingIncluded: string[] | null;
  existingExcluded: string[] | null;
  /** The latest draft (discoveryInformationRef.current). */
  showSchools: boolean | undefined;
  schools: string[] | undefined;
  excludedSchools: string[] | undefined;
  /** currentExcludeSchools ref: the latest excludedSchools pick. */
  currentExcludeSchools: string[];
}

/** Whether the school configuration part of the draft can be saved. */
export const isExtraSchoolConfigurationOk = ({
  possibleSchoolCount,
  extraSchoolConfigurationNeeded,
  institutionTypeCount,
  hasConfigurationEntity,
  existingIncluded: eSI,
  existingExcluded: eSE,
  showSchools,
  schools,
  excludedSchools,
  currentExcludeSchools,
}: ExtraSchoolConfigurationInput): boolean => {
  if (possibleSchoolCount === 0) {
    return false;
  }

  if (!extraSchoolConfigurationNeeded) {
    // Note: `undefined >= 0` is false, so a draft without these arrays would
    // be invalid. Unreachable: the backend always sends schools and
    // excludedSchools (confirmed 2026-10-13), so it is kept.
    return (
      excludedSchools !== undefined &&
      excludedSchools.length >= 0 &&
      schools !== undefined &&
      schools.length >= 0
    );
  }

  const hasOwnSelection =
    currentExcludeSchools.length > 0 || (schools !== undefined && schools.length > 0);
  const base =
    Boolean(showSchools) &&
    hasConfigurationEntity &&
    institutionTypeCount !== undefined &&
    institutionTypeCount > 0 &&
    hasOwnSelection;

  if (institutionTypeCount !== 1) {
    // Several types: other integrations' schools are not checked.
    return base;
  }

  let configurationCheckOk = true;
  // Another integration includes ALL schools -> this one may not exclude.
  if (eSI !== null && eSI.length === 0 && excludedSchools !== undefined && excludedSchools.length > 0) {
    configurationCheckOk = false;
  }
  // Another integration excludes schools -> this one may include only those.
  if (eSE !== null && eSE.length > 0) {
    (schools ?? []).forEach((school) => {
      if (eSE.indexOf(school) < 0) {
        configurationCheckOk = false;
      }
    });
  }
  // A school already included elsewhere may not be included again.
  if (eSI !== null && eSI.length > 0 && configurationCheckOk) {
    (schools ?? []).forEach((school) => {
      if (eSI.indexOf(school) >= 0) {
        configurationCheckOk = false;
      }
    });
  }

  return configurationCheckOk && base;
};

// ---------------------------------------------------------------------------
// validateSchoolSelection
// ---------------------------------------------------------------------------

export interface SchoolSelectionValidityInput extends ExtraSchoolConfigurationInput {
  /** The draft configurationEntity has an idp. */
  draftHasIdp: boolean;
  /** The "showSchools" switch (the draft's showSchools may lag for a new integration). */
  showSchoolsSwitch: boolean;
  /** Own schools that production does not offer (kept, not removed, until the user removes them). */
  notAllowedSchoolCount: number;
}

/**
 * Whether SchoolSelection reports its part of the draft as saveable.
 *
 * Derived from the current values. There are no logo or environment rules
 * here: the parent requires a logo for every idp anyway (IntegrationDetails'
 * logoOK, ANDed into canSave) - see the equivalence test in
 * schoolRules.test.ts.
 */
export const validateSchoolSelection = (input: SchoolSelectionValidityInput): boolean => {
  const { draftHasIdp, showSchoolsSwitch, notAllowedSchoolCount, institutionTypeCount = 0, possibleSchoolCount } = input;

  if (!showSchoolsSwitch) {
    return true;
  }
  // The former localCanSave latch: the school view needs types and options.
  if (institutionTypeCount === 0 || possibleSchoolCount === 0) {
    return false;
  }
  if (notAllowedSchoolCount > 0) {
    return false;
  }
  return isExtraSchoolConfigurationOk(input) && draftHasIdp;
};
