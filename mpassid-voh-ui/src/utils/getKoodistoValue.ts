import type { Components } from "@/api/koodisto";

const getKoodistoValue = (
  koodisto: Components.Schemas.KoodiDtosBasic,
  key: string,
  language: string
) =>
  koodisto
    .find(({ koodiArvo }) => koodiArvo === key)
    ?.metadata.find((data) => data.kieli === language)?.nimi;

export default getKoodistoValue;
