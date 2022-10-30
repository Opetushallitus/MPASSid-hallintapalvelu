import { usePaginationPage } from "@/utils/components/pagination";
import { useSearchParams } from "react-router-dom";
import * as client from "./client";

export * from "./client";

// https://www.npmjs.com/package/@visma/react-openapi-client-generator#mutations-and-updates

export function useIntegrationsSearchPageable(size = 5) {
  const [page] = usePaginationPage();
  const [searchParams] = useSearchParams();

  return client.useIntegrationsSearchPageable({
    search: searchParams.get("hae") ?? "",
    pageable: {},
    role: searchParams.get("rooli") ?? undefined,
    type: searchParams.get("tyyppi") ?? undefined,
    deploymentPhase: searchParams.has("testi")
      ? JSON.parse(searchParams.get("testi")!)
        ? 0
        : 1
      : undefined,
    page,
    size,
    sort: searchParams.getAll("sort") ?? undefined,
  });
}
