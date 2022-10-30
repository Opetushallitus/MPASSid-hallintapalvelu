export const types = [
  "azure",
  "adfs",
  "google",
  "opinsys",
  "wilma",
  "saml2",
  "oidc",
] as const;
export const roles = ["idp", "sp"] as const;
export const openIntegrationsSessionStorageKey =
  "mpassid-open-integration-tabs";
