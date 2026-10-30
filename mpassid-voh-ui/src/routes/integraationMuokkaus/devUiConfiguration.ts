import type { UiConfiguration } from "../../config";

/** localStorage key (development only): extra dataConfiguration items as a JSON array. */
export const DEV_UI_CONFIGURATION_KEY = "e2e-ui-configuration";

/**
 * Development/e2e only: appends the dataConfiguration items stored in
 * localStorage under DEV_UI_CONFIGURATION_KEY, so new kinds of items can be
 * tried (e2e/data-configuration.spec.ts) without editing config.ts. Items are
 * only appended: config.ts has items that share a name (clientId, entityId,
 * wantAssertionsSigned differ by integration type or environment), so there is
 * no unambiguous "replace". Reaches the edit form's Attributes, Metadata and
 * AttributeTest through index.tsx; Role reads config.ts directly.
 *
 * import.meta.env.DEV is statically false in production builds, so this is a
 * no-op there.
 */
export function withDevUiConfiguration(configuration: UiConfiguration[]): UiConfiguration[] {
  if (!import.meta.env.DEV) {
    return configuration;
  }
  try {
    const stored = globalThis.localStorage?.getItem(DEV_UI_CONFIGURATION_KEY);
    if (!stored) {
      return configuration;
    }
    const extra: unknown = JSON.parse(stored);
    return Array.isArray(extra) ? [...configuration, ...(extra as UiConfiguration[])] : configuration;
  } catch {
    return configuration;
  }
}
