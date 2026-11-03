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

/**
 * The configuration entity as the attribute forms initialize it on opening:
 * a data/user attribute missing from `attributes` gets the value of the
 * idp/sp field of the same name (Attributes.tsx). The edit form compares
 * the drafts against this, not the stored entity - e.g. a SAML integration
 * is created without the data attribute "entityId" (the draft's sp.entityId
 * is still empty then), and opening it added the attribute, which made an
 * unchanged integration saveable.
 */
export function withProviderFieldAttributes(
  configurationEntity: Components.Schemas.ConfigurationEntity | undefined,
  configurations: { name: string; type: string; integrationType: { name: string }[] }[],
  type: string
): Components.Schemas.ConfigurationEntity | undefined {
  if (!configurationEntity?.attributes) {
    return configurationEntity;
  }
  const provider = (configurationEntity.idp ?? configurationEntity.sp) as Provider | undefined;
  if (!provider) {
    return configurationEntity;
  }
  const attributes = [...configurationEntity.attributes];
  configurations
    .filter((configuration) => configuration.type === "data" || configuration.type === "user")
    .filter((configuration) => configuration.integrationType.some((integrationType) => integrationType.name === type))
    .forEach((configuration) => {
      const value = provider[configuration.name];
      if (value && !attributes.some((attribute) => attribute.name === configuration.name)) {
        attributes.push({ type: configuration.type as "data" | "user", name: configuration.name, content: String(value) });
      }
    });
  return attributes.length === configurationEntity.attributes.length
    ? configurationEntity
    : { ...configurationEntity, attributes };
}
