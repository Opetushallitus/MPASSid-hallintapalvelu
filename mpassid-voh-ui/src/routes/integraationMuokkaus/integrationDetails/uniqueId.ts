/**
 * The integration type's unique id (config.ts "uniqueId" item: wilma ->
 * hostname, opinsys -> tenantId, azure/saml -> entityId, oidc -> clientId)
 * is edited as an attribute, but saved and shown ("Yksilöllinen tunniste")
 * from the idp/sp field of the same name.
 */
import type { Components } from "@/api";

type Provider = Record<string, unknown>;

/**
 * The draft with the unique id attribute copied into the idp/sp field of the
 * same name: the attribute's content, else the field's current value, else
 * "". Returns the same object when nothing changes.
 */
export function withUniqueId(
  configurationEntity: Components.Schemas.ConfigurationEntity,
  attribute: string | undefined
): Components.Schemas.ConfigurationEntity {
  if (!attribute) {
    return configurationEntity;
  }
  const attributeContent = configurationEntity.attributes
    ?.filter((candidate) => candidate.name === attribute)
    .map((candidate) => candidate.content)[0];
  const uniqueId = (provider: Provider) => attributeContent || provider[attribute] || "";

  let result = configurationEntity;
  const idp = configurationEntity.idp as Provider | undefined;
  if (idp && idp[attribute] !== uniqueId(idp)) {
    result = {
      ...result,
      idp: { ...idp, [attribute]: uniqueId(idp) } as Components.Schemas.IdentityProvider,
    };
  }
  const sp = configurationEntity.sp as Provider | undefined;
  if (sp && sp[attribute] !== uniqueId(sp)) {
    result = {
      ...result,
      sp: { ...sp, [attribute]: uniqueId(sp) } as Components.Schemas.ServiceProvider,
    };
  }
  return result;
}
