import { getIntegrationDiscoveryInformation } from "@/api";
import { useEffect, useState } from "react";

/**
 * The organisation's other production integrations' school configuration
 * (getIntegrationDiscoveryInformation), as state. The ONLY place that calls
 * the API for SchoolSelection.
 *
 * One request per key (organisation, integration, institution types,
 * environment, reloadToken). A response for an outdated key is ignored, so a
 * slow answer to an earlier institution type choice can no longer overwrite
 * a newer one (the former race: SchoolSelection fired up to three
 * uncancelled requests per change and the last answer won).
 *
 * Statuses:
 *  - "skipped": nothing to load (no schools/organisation or no types chosen).
 *  - "nonProduction": not a production integration - no request, the other
 *    integrations' rules do not apply.
 *  - "loading" / "ok" / "error": production; `ok` carries the result.
 *
 * Every result carries the institutionTypes/environment it was produced for,
 * so the caller applies it with exactly those values.
 */
export type SiblingSchoolConfig =
  | { status: "skipped"; key: string }
  | {
      status: "nonProduction";
      key: string;
      institutionTypes: number[];
      environment: number;
    }
  | {
      status: "loading";
      key: string;
      institutionTypes: number[];
      environment: number;
    }
  | {
      status: "ok";
      key: string;
      institutionTypes: number[];
      environment: number;
      existingIncluded: string[] | null;
      existingExcluded: string[] | null;
    }
  | {
      status: "error";
      key: string;
      institutionTypes: number[];
      environment: number;
      error: unknown;
    };

type Fetched = Extract<SiblingSchoolConfig, { status: "ok" | "error" }>;

export function useSiblingSchoolConfig({
  enabled,
  organizationOid,
  integrationId,
  institutionTypes,
  environment,
  reloadToken,
}: {
  /** False until the organisation's schools are known. */
  enabled: boolean;
  organizationOid: string | undefined;
  integrationId: number | undefined;
  institutionTypes: number[];
  environment: number;
  /** Increment to load again with otherwise unchanged parameters. */
  reloadToken: number;
}): SiblingSchoolConfig {
  const key = JSON.stringify([
    organizationOid,
    integrationId,
    institutionTypes,
    environment,
    reloadToken,
  ]);
  const shouldFetch =
    enabled && Boolean(organizationOid) && institutionTypes.length > 0 && environment === 1;

  const [fetched, setFetched] = useState<Fetched>();

  useEffect(() => {
    if (!shouldFetch) {
      return;
    }
    let ignore = false;
    const types = institutionTypes;
    getIntegrationDiscoveryInformation({
      organizationOid: organizationOid!,
      institutionType: types,
      // Required by the backend (it excludes this integration); a new
      // integration has id 0.
      id: integrationId ?? 0,
    })
      .then((response) => {
        if (!ignore) {
          setFetched({
            status: "ok",
            key,
            institutionTypes: types,
            environment,
            // Same normalization as before: a missing field means null.
            existingIncluded:
              response.existingIncluded !== undefined ? response.existingIncluded : null,
            existingExcluded:
              response.existingExcluded !== undefined ? response.existingExcluded : null,
          });
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setFetched({ status: "error", key, institutionTypes: types, environment, error });
        }
      });
    return () => {
      ignore = true;
    };
    // `key` covers organizationOid, integrationId, institutionTypes,
    // environment and reloadToken.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, shouldFetch]);

  if (!enabled || !organizationOid || institutionTypes.length === 0) {
    return { status: "skipped", key };
  }
  if (environment !== 1) {
    return { status: "nonProduction", key, institutionTypes, environment };
  }
  if (fetched?.key === key) {
    return fetched;
  }
  return { status: "loading", key, institutionTypes, environment };
}
