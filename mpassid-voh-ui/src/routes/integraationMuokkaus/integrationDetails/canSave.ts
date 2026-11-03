/**
 * Whether IntegrationDetails' drafts can be saved, derived from the current
 * values. The configuration and discoveryInformation sides have their own
 * rules, with these differences:
 *  - the discoveryInformation side does not check the ADFS/Gsuite metadata,
 *  - a changed discoveryInformation needs no logo on that side (the
 *    configuration side still requires it, and both must hold).
 */
import type { Components } from "@/api";
import { isEqual } from "lodash";

export interface ChildValidity {
  dataAttribute: boolean;
  userAttribute: boolean;
  metadata: boolean;
  schoolSelection: boolean;
  roleDetails: boolean;
}

export interface DetailsCanSaveInput {
  role: "idp" | "sp";
  /** The integration as it was opened. */
  original: Components.Schemas.Integration;
  configurationEntity: Components.Schemas.ConfigurationEntity | undefined;
  discoveryInformation: Components.Schemas.DiscoveryInformation | undefined;
  valid: ChildValidity;
  metadataFileCount: number;
  metadataUrl: string;
  newLogo: boolean;
  environmentChanged: boolean;
  /** The service name (sp), kept outside the configurationEntity draft. */
  name: string;
}

export interface DetailsCanSave {
  configurationEntity: boolean;
  discoveryInformation: boolean;
}

/** An sp needs no logo; an idp needs a saved or a newly chosen one. */
export const logoOk = ({ role, newLogo, configurationEntity }: DetailsCanSaveInput) =>
  role === "sp" ||
  newLogo ||
  (configurationEntity?.idp?.logoUrl !== undefined && configurationEntity?.idp?.logoUrl !== "");

export function computeDetailsCanSave(input: DetailsCanSaveInput): DetailsCanSave {
  const {
    role,
    original,
    configurationEntity,
    discoveryInformation,
    valid,
    metadataFileCount,
    metadataUrl,
    newLogo,
    environmentChanged,
    name,
  } = input;

  const childrenValid =
    valid.dataAttribute &&
    valid.userAttribute &&
    valid.metadata &&
    valid.schoolSelection &&
    valid.roleDetails;
  const logo = logoOk(input);
  // name lives in its own state, so a name-only sp edit leaves the
  // configurationEntity draft unchanged.
  const nameChanged = role === "sp" && name !== (original.configurationEntity?.sp?.name || "");
  const configurationChanged = !isEqual(configurationEntity, original.configurationEntity);
  const discoveryInformationChanged = !isEqual(discoveryInformation, original.discoveryInformation);
  const metadataFileChosen = metadataFileCount === 1;

  let canSaveConfigurationEntity = false;
  if (configurationEntity) {
    const metadataIdpOk = !(
      configurationEntity.idp &&
      (configurationEntity.idp.type === "adfs" || configurationEntity.idp.type === "gsuite") &&
      metadataFileCount === 0 &&
      metadataUrl === ""
    );
    const ok = childrenValid && metadataIdpOk && logo;
    canSaveConfigurationEntity =
      !configurationChanged && !nameChanged
        ? discoveryInformation !== undefined &&
          (discoveryInformationChanged || metadataFileChosen || newLogo || environmentChanged) &&
          ok
        : ok;
  }

  // No discoveryInformation draft (an sp): this side does not restrict.
  let canSaveDiscoveryInformation = true;
  if (discoveryInformation !== undefined) {
    canSaveDiscoveryInformation = !discoveryInformationChanged
      ? configurationEntity !== undefined &&
        (configurationChanged || newLogo || metadataFileChosen || environmentChanged || nameChanged) &&
        logo &&
        childrenValid
      : childrenValid;
  }

  return {
    configurationEntity: canSaveConfigurationEntity,
    discoveryInformation: canSaveDiscoveryInformation,
  };
}
