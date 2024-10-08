import type { Components } from "@/api";
import type { roles } from "@/config";
import { DataRowContainer } from "../integraatio/IntegrationTab/DataRow";
import type { UniqueIdValue } from "./IntegrationBasicDetails";

export default function UniqueId({
  configurationEntity,
  role,
  ValueComponent,
}: {
  configurationEntity: Components.Schemas.ConfigurationEntity;
  role: typeof roles[number];
  ValueComponent: typeof UniqueIdValue;
}) {
  const { type } = configurationEntity[role]!;

  const saml = () => (
    <DataRowContainer object={configurationEntity} path="sp.entityId">
      <ValueComponent />
    </DataRowContainer>
  );

  const provider = {
    idp: {
      adfs: () => (
        <DataRowContainer object={configurationEntity} path="idp.entityId">
          <ValueComponent />
        </DataRowContainer>
      ),
      azure: () => (
        <DataRowContainer object={configurationEntity} path="idp.entityId">
          <ValueComponent />
        </DataRowContainer>
      ),
      google: () => (
        <DataRowContainer object={configurationEntity} path="idp.entityId">
          <ValueComponent />
        </DataRowContainer>
      ),
      gsuite: () => (
        <DataRowContainer object={configurationEntity} path="idp.entityId">
          <ValueComponent />
        </DataRowContainer>
      ),
      opinsys: () => (
        <DataRowContainer object={configurationEntity} path="idp.tenantId">
          <ValueComponent />
        </DataRowContainer>
      ),
      wilma: () => (
        <DataRowContainer object={configurationEntity} path="idp.hostname">
          <ValueComponent />
        </DataRowContainer>
      ),
    },
    sp: {
      saml,
      saml2: saml,
      oidc: () => (
        <DataRowContainer object={configurationEntity} path="sp.clientId">
          <ValueComponent />
        </DataRowContainer>
      ),
    },
    set: {
      saml,
      saml2: saml,
      oidc: () => (
        <DataRowContainer object={configurationEntity} path="sp.clientId">
          <ValueComponent />
        </DataRowContainer>
      ),
    },
  }[role];

  const path = provider[type as keyof typeof provider];

  return path?.() ?? null;
}
