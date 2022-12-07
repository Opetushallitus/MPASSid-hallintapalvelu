export const roles = ["idp", "sp"] as const;
export const openIntegrationsSessionStorageKey =
  "mpassid-open-integration-tabs";
export const attributePreferredOrder = ["firstName", "surname"]
  // Tallennetaan käännetty järjestys, jotta järjestäminen on optimaalisempi ja puuttuvat arvot järjestetään loppuun.
  .reverse();

// Lokalisointi
export const category = "mpassid-hallinta";
