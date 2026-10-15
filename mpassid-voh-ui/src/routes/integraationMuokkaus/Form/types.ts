/**
 * Types for the dynamic attribute/metadata editing forms.
 *
 * The OpenAPI schema types service-provider metadata loosely
 * (`{ [name: string]: { [key: string]: any } }`), but what the UI actually
 * stores there - driven by `dataConfiguration` in config.ts - is one of: a
 * single value (input/switch/select), a list of strings (array attribute) or
 * a list of objects (array attribute with `object` sub-configuration).
 */

/** One object in an "array of objects" metadata attribute. */
export interface MetadataEntry {
  [key: string]: MetadataValue;
}

/** A value of a single metadata attribute. */
export type MetadataValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | MetadataEntry[];

/** Service-provider metadata as edited by the UI, keyed by attribute name. */
export type MetadataMap = Record<string, MetadataValue>;

/** The `{ name, type, content }` item every form component renders. */
export interface FormObject<Content = MetadataValue> {
  name?: string;
  type?: string;
  content?: Content;
}

/** A metadata attribute as built by Metadata.tsx and rendered by MetadataForm. */
export interface MetadataFormObject {
  type: string;
  name: string;
  role: string;
  content: MetadataValue;
}

/**
 * A value the metadata forms report upwards: an attribute value, or one new
 * object for an "array of objects" attribute (ObjectForm's current entry).
 */
export type MetadataUpdate = MetadataValue | MetadataEntry;

/** Imperative handle exposed by ObjectForm (`objectData` ref). */
export interface ObjectFormHandle {
  clean(): void;
  validate(): boolean;
  edit(editObject?: MetadataEntry): void;
}

/** Imperative handle exposed by ListForm (`pressButton` ref). */
export interface ListFormHandle {
  pressEnter(): void;
}

/** True for values that have a `length` (strings and arrays). */
export const hasLength = (value: unknown): value is string | unknown[] =>
  typeof value === "string" || Array.isArray(value);
