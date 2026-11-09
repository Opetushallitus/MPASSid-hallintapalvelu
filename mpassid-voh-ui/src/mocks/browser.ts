import { handlers } from "@visma/msw-openapi-backend-integration";
import { mapValues } from "lodash";
import { setupWorker } from "msw/browser";
import type { Document } from "openapi-backend";
import koodistoDefinition from "../../schemas/koodisto.json";
import käyttöoikeusDefinition from "../../schemas/käyttöoikeus.json";
import localisationDefinition from "../../schemas/localisation.json";
import organisaatioDefinition from "../../schemas/organisaatio.json";
import requestLogicHandlers, { definition, koodistoRequestLogicHandlers } from "./requestLogicHandlers.js";

function mapDeep<T>(object: T, callback: (value: unknown) => unknown): T {
  const callback_ = (value: unknown) => {
    value = callback(value);
    return typeof value === "object" ? mapDeep(value, callback) : value;
  };

  if (Array.isArray(object)) {
    object.map(callback_);
  } else if (typeof object === "object" && object !== null) {
    mapValues(object, callback_);
  }

  return object;
}

// Fixes: unknown format "date" / "date-time" ignored in schema at path
const patchSchema = (schema: Document) =>
  mapDeep(schema, (value: unknown) => {
    if (
      typeof value === "object" &&
      value !== null &&
      "format" in value &&
      typeof value.format === "string" &&
      ["date", "date-time"].includes(value.format)
    ) {
      delete (value as { format?: string }).format;
    }
    return value;
  });

export const worker = setupWorker(
  ...handlers(
    {
      definition: patchSchema(definition as unknown as Document),
    },
    requestLogicHandlers
  ),
  ...handlers({
    definition: patchSchema(käyttöoikeusDefinition as unknown as Document),
  }),
  ...handlers(
    {
      definition: patchSchema(koodistoDefinition as Document),
    },
    koodistoRequestLogicHandlers
  ),
  ...handlers({
    definition: patchSchema(localisationDefinition as Document),
  }),
  ...handlers({
    definition: patchSchema(organisaatioDefinition as Document),
  })
);
