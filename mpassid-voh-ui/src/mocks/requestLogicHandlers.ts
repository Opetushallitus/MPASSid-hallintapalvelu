import type { Components } from "@/api";
import { getRole } from "@/routes/home/IntegrationsTable";
import type { RequestLogicHandlers } from "@visma/msw-openapi-backend-integration";
import { get, orderBy } from "lodash";
import definition from "../../../schema.json";

export { definition };

let allIntegrations: Components.Schemas.Integration[] =
  definition.paths["/api/v1/integration/list"].get.responses["200"].content[
    "application/json"
  ].examples.integrations.value;

const integration: { value?: Components.Schemas.Integration } =
  definition.paths["/api/v1/integration/{id}"].get.responses["200"].content[
    "application/json"
  ].examples.integration;

const searchIntegrations: { value?: Components.Schemas.PageIntegration } =
  definition.paths["/api/v1/integration/search"].get.responses["200"].content[
    "application/json"
  ].examples.searchIntegrations;

allIntegrations = Array(21).fill(allIntegrations).flat();

allIntegrations.push(
  ...allIntegrations.map((row) => ({
    ...row,
    configurationEntity: {
      entityId: undefined as unknown as string,
      ...row.configurationEntity,
    },
    deploymentPhase: 1,
    organization: {
      ...row.organization,
      //name: `${row.organization!.name} (julkaistu)`,
    },
  }))
);

let id = 1000;
allIntegrations = allIntegrations.map((row) => ({
  ...row,
  id: id++,
}));

const defaults = {
  page: 1,
  size: 25,
};

export default {
  getIntegration(request) {
    const id = Number(request.params.id);
    integration.value = allIntegrations.find((row) => row.id === id);
  },
  getIntegrationsSearchPageable(request) {
    const page = Number(request.query.page ?? defaults.page);
    const size = Number(request.query.size ?? defaults.size);
    const query = request.query;
    const search = (query.search as string)?.toLowerCase();

    let filteredElements = [...allIntegrations];
    if (search) {
      filteredElements = filteredElements.filter((element) =>
        [
          "configurationEntity.name",
          "organization.oid",
          "organization.name",
          "organization.ytunnus",
        ].some((path) => get(element, path)?.toLowerCase().includes(search))
      );
    }
    const deploymentPhase = JSON.parse(
      (query.deploymentPhase as string) ?? "1"
    );

    filteredElements = filteredElements.filter(
      (row) => row.deploymentPhase === deploymentPhase
    );

    if ("type" in query) {
      const types = (query.type as string).split(",").filter(Boolean);

      filteredElements = filteredElements.filter((row) =>
        types.includes(row.configurationEntity![getRole(row)]!.type!)
      );
    }

    if ("role" in query) {
      const roles = (query.role as string).split(",").filter(Boolean);

      filteredElements = filteredElements.filter((row) =>
        roles.includes(getRole(row))
      );
    }

    if ("sort" in query) {
      const sort = Array.isArray(query.sort) ? query.sort[0] : query.sort;
      const [path, direction] = sort.split(",").slice(0, 2);
      filteredElements = orderBy(
        filteredElements,
        [path],
        [direction as boolean | "asc" | "desc"]
      );
    }

    const start = (page - 1) * size;
    const end = start + size;
    const content = filteredElements.slice(start, end);
    const empty = Boolean(filteredElements.length);

    // Update mock data in place
    searchIntegrations.value = {
      totalPages: Math.ceil(filteredElements.length / size),
      totalElements: filteredElements.length,
      size,
      content,
      number: page,
      sort: {
        empty,
        sorted: true,
        unsorted: false,
      },
      pageable: {
        offset: 0,
        sort: {
          empty: false,
          sorted: true,
          unsorted: false,
        },
        pageNumber: page,
        pageSize: size,
        paged: true,
        unpaged: false,
      },
      numberOfElements: content.length,
      first: start === 0,
      last: filteredElements.length <= end,
      empty,
    };
  },
} as RequestLogicHandlers;