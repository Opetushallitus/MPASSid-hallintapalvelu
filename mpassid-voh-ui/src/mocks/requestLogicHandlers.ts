import { getRole } from "@/routes/home/IntegrationsTable";
import type { RequestLogicHandlers } from "@visma/msw-openapi-backend-integration";
import { get, orderBy } from "lodash";
import definition from "../../../schema.json";

export { definition };

const { integrations } =
  definition.paths["/api/v1/integration/page"].get.responses["200"].content[
    "*/*"
  ].examples;

let { content: allContent } = integrations.value;

allContent = Array(21).fill(allContent).flat();

allContent.push(
  ...allContent.map((element) => ({
    ...element,
    configurationEntity: {
      entityId: undefined as unknown as string,
      ...element.configurationEntity,
      test: true,
    },
    organization: {
      ...element.organization,
      name: `${element.organization.name} (testi)`,
    },
  }))
);

let id = 1000;
allContent = allContent.map((row) => ({
  ...row,
  id: id++,
}));

const defaults = {
  page: 1,
  size: 25,
};

export default {
  getIntegrationsPageable(request) {
    const page = Number(request.query.page ?? defaults.page);
    const size = Number(request.query.size ?? defaults.size);
    const query = request.query as { [key: string]: string };
    const find = query.find?.toLowerCase();

    let filteredElements = [...allContent];
    if (find) {
      filteredElements = filteredElements.filter((element) =>
        [
          "configurationEntity.name",
          "organization.oid",
          "organization.name",
          "organization.ytunnus",
        ].some((path) => get(element, path)?.toLowerCase().includes(find))
      );
    }
    const test = JSON.parse(query.test ?? "false");

    filteredElements = filteredElements.filter(
      (row) => Boolean(row.configurationEntity.test) === test
    );

    if ("type" in query) {
      const types = query.type.split(",").filter(Boolean);

      filteredElements = filteredElements.filter((row) =>
        types.includes(row.configurationEntity[getRole(row)].type)
      );
    }

    if ("role" in query) {
      const roles = query.role.split(",").filter(Boolean);

      filteredElements = filteredElements.filter((row) =>
        roles.includes(getRole(row))
      );
    }

    filteredElements = filteredElements.filter(
      (row) => Boolean(row.configurationEntity.test) === test
    );

    if ("sort" in query) {
      const [path, direction] = query.sort.split(",").slice(0, 2);
      filteredElements = orderBy(filteredElements, [path], [direction]);
    }

    const start = (page - 1) * size;
    const end = start + size;
    const content = filteredElements.slice(start, end);
    const empty = Boolean(filteredElements.length);

    // Update mock data in place
    integrations.value = {
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
        //        "sort": { "$ref": "#/components/schemas/Sort" },
        sort: [""],
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
