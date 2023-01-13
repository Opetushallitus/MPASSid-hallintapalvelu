import type { Components } from "@/api";
import type { roles } from "@/config";
import type { UniqueIdValue } from ".";
import { DataRowContainer } from "./DataRow";

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
  }[role];

  const path = provider[type as keyof typeof provider];

  return path?.() ?? null;
}
