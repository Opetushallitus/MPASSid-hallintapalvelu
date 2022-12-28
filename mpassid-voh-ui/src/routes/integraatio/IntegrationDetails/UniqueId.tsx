import type { Components } from "@/api";
import type { roles } from "@/config";
import type { UniqueIdValue } from ".";
import { AttributeRowContainer } from "./Attribute";
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
        <AttributeRowContainer
          configurationEntity={configurationEntity}
          name="idp.tenantId"
        >
          <ValueComponent />
        </AttributeRowContainer>
      ),
    },
    sp: {
      saml2: () => (
        <DataRowContainer object={configurationEntity} path="sp.entityId">
          <ValueComponent />
        </DataRowContainer>
      ),
      oidc: () => (
        <AttributeRowContainer
          configurationEntity={configurationEntity}
          name="clientId"
        >
          <ValueComponent />
        </AttributeRowContainer>
      ),
    },
  }[role];

  const path = provider[type as keyof typeof provider];

  return path?.() ?? null;
}
