import { helperText, validate } from "@/utils/Validators";

// Module-level field callbacks for SchoolSelection's forms.

/** No validation rules (the draft is validated by validateSchoolSelection). */
export const noValidation = (value: string) => validate([], value);

/** No helper text. */
export const noHelperText = (value: string) => helperText([], value);

/**
 * Child forms report their own validity, but SchoolSelection validates the
 * draft itself (validateSchoolSelection), so their reports are ignored.
 */
export const ignoreCanSave = () => {};

/** The excludedSchools field's helper: other integrations' schools are excluded automatically. */
export const excludedSchoolsHelperText =
  (existingIncluded: string[] | null) => (value: string) =>
    existingIncluded !== null && existingIncluded.length > 0
      ? helperText(["extraExcludes"], value)
      : helperText([], value);
