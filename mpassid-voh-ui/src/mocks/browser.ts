import { handlers } from "@visma/msw-openapi-backend-integration";
import { mapValues } from "lodash";
import { setupWorker } from "msw";
import type { Document } from "openapi-backend";
import koodistoDefinition from "../../schemas/koodisto.json";
import localisationDefinition from "../../schemas/localisation.json";
import requestLogicHandlers, { definition } from "./requestLogicHandlers.js";

function mapDeep(object: any, callback: any): any {
  const callback_ = (value: any) => {
    value = callback(value);
    return typeof value === "object" ? mapDeep(value, callback) : value;
  };

  return Array.isArray(object)
    ? object.map(callback_)
    : mapValues(object, callback_);
}

// Fixes: unknown format "date-time" ignored in schema at path
const patchSchema = (schema: Document) =>
  mapDeep(schema, (value: any) => {
    if (typeof value === "object" && value?.format === "date-time") {
      delete value.format;
    }
    return value;
  });

export const worker = setupWorker(
  ...handlers(
    {
      definition: definition as unknown as Document,
    },
    requestLogicHandlers
  ),
  ...handlers({
    definition: patchSchema(koodistoDefinition as Document),
  }),
  ...handlers({
    definition: patchSchema(localisationDefinition as Document),
  })
);
