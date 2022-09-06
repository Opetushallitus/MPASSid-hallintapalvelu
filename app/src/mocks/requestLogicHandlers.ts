import definition from "../../../schema.json";
import type { RequestLogicHandlers } from "@visma/msw-openapi-backend-integration";

export { definition };

const desserts: any[] =
  definition.paths["/desserts"].get.responses["200"].content["application/json"]
    .examples["example-1"].value;

const dessertsCopy = [...desserts];

export default {
  searchDesserts(request) {
    // Update mock data in place
    desserts.splice(
      0,
      10,
      ...dessertsCopy.filter(({ name }) => name.includes(request.query.query))
    );
  },
} as RequestLogicHandlers;
