export const types = [
  "azure",
  "adfs",
  "google",
  "gsuite",
  "opinsys",
  "wilma",
  "saml2",
  "oidc",
] as const;
export const roles = ["idp", "sp"] as const;
export const openIntegrationsSessionStorageKey =
  "mpassid-open-integration-tabs";
export const attributePreferredOrder = ["firstName", "surname"]
  // Tallennetaan käännetty järjestys, jotta järjestäminen on optimaalisempi ja puuttuvat arvot järjestetään loppuun.
  .reverse();
