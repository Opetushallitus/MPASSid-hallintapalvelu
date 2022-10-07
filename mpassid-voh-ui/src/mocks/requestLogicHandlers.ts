import type { RequestLogicHandlers } from "@visma/msw-openapi-backend-integration";
import { get } from "lodash";
import definition from "../../../schema.json";

export { definition };

const { integrations } =
  definition.paths["/api/v1/integration"].get.responses["200"].content[
    "application/json"
  ].examples;

let { elements } = integrations.value;

elements = Array(21).fill(elements).flat();

elements.push(
  ...elements.map((element) => ({
    ...element,
    id: element.id + 100,
    configurationEntity: {
      ...element.configurationEntity,
      test: true,
    },
    organization: {
      ...element.organization,
      name: `${element.organization.name} (testi)`,
    },
  }))
);

const defaults = {
  page: 1,
  limit: 25,
};

export default {
  getIntegrations(request) {
    const page = Number(request.query.page ?? defaults.page);
    const limit = Number(request.query.limit ?? defaults.limit);
    const query = request.query.query?.toLowerCase();
    let filteredElements = elements;
    if (request.query.query) {
      filteredElements = filteredElements.filter((element) =>
        [
          "configurationEntity.name",
          "organization.oid",
          "organization.name",
          "organization.ytunnus",
        ].some((path) => get(element, path)?.toLowerCase().includes(query))
      );
    }
    const test = JSON.parse(request.query.test ?? "false");

    filteredElements = filteredElements.filter(
      (element) => Boolean(element.configurationEntity.test) === test
    );

    const start = (page - 1) * limit;
    const end = start + limit;

    // Update mock data in place
    integrations.value = {
      elements: filteredElements.slice(start, end),
      page: {
        totalPages: Math.ceil(filteredElements.length / limit),
        totalElements: filteredElements.length,
        size: limit,
        number: page,
      },
    };
  },
} as RequestLogicHandlers;
