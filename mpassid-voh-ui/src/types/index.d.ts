import type { ApiPageKoodisto } from "@/api/koodisto";
import type { MessageDescriptor } from "@formatjs/intl/src/types";
import type { FormatXMLElementFn, PrimitiveType } from "intl-messageformat";
import type { Options as IntlMessageFormatOptions } from "intl-messageformat/src/core";
import type { Control, Path } from "react-hook-form";

export type Kieli = "EN" | "FI" | "SV";
export type Locale = Lowercase<Kieli>;
export type ApiDate =
  `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
export type Tila = "PASSIIVINEN" | "LUONNOS" | "HYVAKSYTTY";
export type PageSize = 10 | 20 | 50 | 100;

type MapDateToApiDate<PropType> = PropType extends Date ? ApiDate : PropType;

export type MapToApiObject<T> = {
  [PropertyKey in keyof T]: MapDateToApiDate<T[PropertyKey]>;
};

export type KoodiMetadata = Metadata & {
  lyhytNimi?: string;
};
export type Metadata = {
  kieli: Kieli;
  nimi: string;
  kuvaus?: string;
};

export type CSVKoodi = CSVUpsertKoodi & {
  versio: number;
  version: number;
  koodiUri: string;
  paivitysPvm: string;
  resourceUri: string;
  tila: string;
  koodisto?: { koodistoUri: string };
};

export type CSVUpsertKoodi = {
  koodiArvo: string;
  versio?: number;
  voimassaAlkuPvm?: string;
  voimassaLoppuPvm?: string;
  metadata: Metadata[];
};

export type InsertKoodistoRyhma = {
  nimi: {
    fi: string;
    sv: string;
    en: string;
  };
};
export type KoodistoRyhma = InsertKoodistoRyhma & {
  koodistoRyhmaUri: string;
};

export type CsvKoodiObject = {
  koodistoUri: string;
  koodiArvo: string;
  versio: string;
  voimassaAlkuPvm?: string;
  voimassaLoppuPvm?: string;
  nimi_FI: string;
  nimi_SV: string;
  nimi_EN: string;
  lyhytNimi_FI: string;
  lyhytNimi_SV: string;
  lyhytNimi_EN: string;
  kuvaus_FI: string;
  kuvaus_SV: string;
  kuvaus_EN: string;
  newRow: boolean;
};

export type MessageFormatter = (
  descriptor: MessageDescriptor,
  values?: Record<string, PrimitiveType | FormatXMLElementFn<string, string>>,
  opts?: IntlMessageFormatOptions
) => string;

export type SelectOptionType = {
  value: string;
  label: string;
};
export type OrganisaatioNimi = Record<Locale, string>;
export type BaseKoodisto = {
  koodistoUri: string;
  versio: number;
  voimassaAlkuPvm: Date;
  voimassaLoppuPvm?: Date;
};
export type ListKoodisto = BaseKoodisto & {
  nimi?: string;
  kuvaus?: string;
  ryhmaNimi?: string;
  ryhmaUri?: string;
  koodiCount: number;
};

export type KoodistoRelation = {
  koodistoUri: string;
  koodistoVersio: number;
  passive?: boolean;
  nimi?: {
    fi: string;
    sv: string;
    en: string;
  };
  kuvaus?: {
    fi: string;
    sv: string;
    en: string;
  };
};

export type PageKoodisto = BaseKoodisto & {
  lockingVersion: number;
  koodistoRyhmaUri: SelectOption;
  resourceUri: string;
  omistaja: string;
  organisaatioOid: SelectOption;
  organisaatioNimi?: OrganisaatioNimi;
  koodistoRyhmaMetadata: Metadata[];
  paivitysPvm: Date;
  paivittajaOid: string;
  tila: Tila;
  metadata: Metadata[];
  koodistoVersio: number[];
  sisaltyyKoodistoihin: KoodistoRelation[];
  sisaltaaKoodistot: KoodistoRelation[];
  rinnastuuKoodistoihin: KoodistoRelation[];
};

export type SelectOption = { label: string; value: string };

export type KoodiRelation = {
  koodiUri: string;
  koodiVersio: number;
  // codeElementValue: string;
  koodistoNimi?: {
    fi: string;
    sv: string;
    en: string;
  };
  nimi?: {
    fi: string;
    sv: string;
    en: string;
  };
  kuvaus?: {
    fi: string;
    sv: string;
    en: string;
  };
};
type BaseKoodi = {
  koodiUri: string;
  versio: number;
  koodiArvo: string;
  tila: Tila;
  paivitysPvm: Date;
  paivittajaOid: string;
  voimassaAlkuPvm: Date;
  voimassaLoppuPvm?: Date;
  metadata: KoodiMetadata[];
};
export type KoodiList = BaseKoodi & {
  koodistoUri: string;
  koodistoVersio: number;
  koodistoNimi?: string;
};
export type Koodi = BaseKoodi & {
  koodisto: ApiPageKoodisto;
  resourceUri: string;
  koodiVersio: number[];
  lockingVersion: number;
  sisaltyyKoodeihin: KoodiRelation[];
  sisaltaaKoodit: KoodiRelation[];
  rinnastuuKoodeihin: KoodiRelation[];
};

export type ControllerProps<T> = {
  control: Control<T>;
  name: Path<T>;
  disabled?: boolean;
  rules?: { required: boolean | string };
};
