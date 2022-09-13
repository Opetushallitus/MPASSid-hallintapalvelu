import { handlers } from "@visma/msw-openapi-backend-integration";
import { setupWorker } from "msw";
import type { Document } from "openapi-backend";
import requestLogicHandlers, { definition } from "./requestLogicHandlers.js";

export const worker = setupWorker(
  ...handlers(
    {
      definition: definition as unknown as Document,
    },
    requestLogicHandlers
  )
);
