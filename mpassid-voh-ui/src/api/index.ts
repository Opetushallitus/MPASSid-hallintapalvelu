import { usePaginationPage } from "@/utils/components/pagination";
import { defaults } from "@/utils/components/RowsPerPage";
import { useSearchParams } from "react-router-dom";
import * as client from "./client";

export * from "./client";

// https://www.npmjs.com/package/@visma/react-openapi-client-generator#mutations-and-updates

export function useIntegrationsSearchPageable() {
  const [page] = usePaginationPage();
  const [searchParams] = useSearchParams();

  return client.useIntegrationsSearchPageable({
    search: searchParams.get("hae") ?? "",
    role: searchParams.get("rooli") ?? undefined,
    type: searchParams.get("tyyppi") ?? undefined,
    deploymentPhase: searchParams.has("testi")
      ? JSON.parse(searchParams.get("testi")!)
        ? 0
        : 1
      : undefined,
    page: page - 1,
    size: searchParams.has(defaults.searchParamName)
      ? JSON.parse(searchParams.get(defaults.searchParamName)!)
      : defaults.default,
    sort: searchParams.getAll("sort") ?? undefined,
  });
}

// import { usePaginationPage } from "@/utils/components/pagination";
// import { useSearchParams } from "react-router-dom";
// import * as client from "./client";

// export * from "./client";

// // https://www.npmjs.com/package/@visma/react-openapi-client-generator#mutations-and-updates

// export function useIntegrationsSearchPageable(size = 5) {
//   const [page] = usePaginationPage();
//   const [searchParams] = useSearchParams();

//   const params = [
//     {
//       name: "page",
//       value: page,
//       in: "query",
//     },
//     {
//       name: "search",
//       value: searchParams.get("hae") ?? "",
//       in: "query",
//     },
//     {
//       name: "size",
//       value: size,
//       in: "query",
//     },
//     ...searchParams.getAll("sort").map((value) => ({
//       name: "sort",
//       value,
//       in: "query",
//     })),
//   ];

//   if (searchParams.has("rooli")) {
//     params.push({
//       name: "role",
//       value: searchParams.get("rooli")!,
//       in: "query",
//     });
//   }

//   if (searchParams.has("tyyppi")) {
//     params.push({
//       name: "type",
//       value: searchParams.get("tyyppi")!,
//       in: "query",
//     });
//   }

//   if (searchParams.has("testi")) {
//     params.push({
//       name: "deploymentPhase",
//       value: JSON.parse(searchParams.get("testi")!) ? "0" : "1",
//       in: "query",
//     });
//   }

//   return client.useIntegrationsSearchPageable(params);
// }
