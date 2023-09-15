import { usePaginationPage } from "@/utils/components/pagination";
import { defaults } from "@/utils/components/RowsPerPage";
import { useSearchParams } from "react-router-dom";
import * as client from "./client";

export * from "./client";

// https://www.npmjs.com/package/@visma/react-openapi-client-generator#mutations-and-updates

export function useIntegrationsSpecSearchPageable() {
  const [page] = usePaginationPage();
  const [searchParams] = useSearchParams();

  return client.useIntegrationsSpecSearchPageable({
    search: searchParams.get("hae") ?? "",
    role: searchParams.get("rooli") ?? undefined,
    type: searchParams.get("tyyppi") ?? undefined,
    referenceIntegration: searchParams.get("integraatio") ?? undefined,
    deploymentPhase: searchParams.has("testi")
      ? JSON.parse(searchParams.get("testi")!)
        ? "0"
        : "1"
      : undefined,
    page: page - 1,
    size: searchParams.has(defaults.searchParamName)
      ? JSON.parse(searchParams.get(defaults.searchParamName)!)
      : defaults.default,
    sort: searchParams.getAll("sort") ?? undefined,
  } as any);
}
