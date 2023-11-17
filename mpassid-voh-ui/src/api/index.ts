import { usePaginationPage } from "@/utils/components/pagination";
import { defaults } from "@/utils/components/RowsPerPage";
import { useLocation, useSearchParams } from "react-router-dom";
import * as client from "./client";

export * from "./client";

// https://www.npmjs.com/package/@visma/react-openapi-client-generator#mutations-and-updates

export function useIntegrationsSpecSearchPageable() {
  const [page] = usePaginationPage();
  const [searchParams] = useSearchParams();
  const location = useLocation()

  if(searchParams.getAll("sort").includes("permissions,asc")||searchParams.getAll("sort").includes("permissions,desc")) {
    searchParams.set("referenceIntegration",String(location.pathname.split("/").pop()))
  }

  return client.useIntegrationsSpecSearchPageable({
    search: searchParams.get("hae") ?? "",
    role: searchParams.get("rooli") ?? undefined,
    deploymentPhase: searchParams.get("ympäristö") ?? undefined,
    type: searchParams.get("tyyppi") ?? undefined,
    referenceIntegration: searchParams.get("referenceIntegration") ?? undefined,
    page: page - 1,
    size: searchParams.has(defaults.searchParamName)
      ? JSON.parse(searchParams.get(defaults.searchParamName)!)
      : defaults.default,
    sort: searchParams.getAll("sort") ?? undefined,
  } as any);
}
