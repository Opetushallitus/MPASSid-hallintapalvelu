import { usePaginationPage } from "@/utils/components/pagination";
import { useSearchParams } from "react-router-dom";
import * as client from "./client";

export * from "./client";

// https://www.npmjs.com/package/@visma/react-openapi-client-generator#mutations-and-updates

export function useIntegrations(limit = 5) {
  const [page, ,] = usePaginationPage();
  const [searchParams] = useSearchParams();
  return client.useIntegrations({
    page,
    limit,
    query: searchParams.get("hae") ?? undefined,
    test: searchParams.has("test")
      ? JSON.parse(searchParams.get("test")!)
      : undefined,
  });
}
