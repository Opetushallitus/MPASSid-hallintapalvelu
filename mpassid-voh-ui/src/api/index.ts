import { usePaginationPage } from "@/utils/components/pagination";
import { useSearchParams } from "react-router-dom";
import * as client from "./client";

export * from "./client";

// https://www.npmjs.com/package/@visma/react-openapi-client-generator#mutations-and-updates

export function useIntegrationsPageable(size = 5) {
  const [page, ,] = usePaginationPage();
  const [searchParams] = useSearchParams();
  return client.useIntegrationsPageable({
    page,
    size,
    sort: searchParams.getAll("sort") ?? undefined,
    find: searchParams.get("hae") ?? undefined,
    role: searchParams.get("rooli") ?? undefined,
    type: searchParams.get("tyyppi") ?? undefined,
    test: searchParams.has("testi")
      ? JSON.parse(searchParams.get("testi")!)
      : undefined,
  });
}
