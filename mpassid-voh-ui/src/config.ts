export const roles = ["idp", "sp", "set"] as const;
export const environments = ["0", "1", "2"] as const;
export const openIntegrationsSessionStorageKey =
  "mpassid-open-integration-tabs";
export const attributePreferredOrder = ["firstName", "surname"]
  // Tallennetaan käännetty järjestys, jotta järjestäminen on optimaalisempi ja puuttuvat arvot järjestetään loppuun.
  .reverse();

// Lokalisointi
export const category = "mpassid-hallinta";

export const testLink =
  // eslint-disable-next-line no-template-curly-in-string
  "https://firmitas.csc.fi/mpass/Shibboleth.sso/Login?entityID=https://mpass-proxy.csc.fi/idp/shibboleth&authnContextClassRef=urn:mpass.id:authnsource:${flowName}";

export const tallentajaOphGroup =
  "APP_MPASSID_TALLENTAJA_1.2.246.562.10.00000000001";
export const katselijaOphGroup =
  "APP_MPASSID_KATSELIJA_1.2.246.562.10.00000000001";  

export const mpassIdUserAttributeTestService = 3000001
