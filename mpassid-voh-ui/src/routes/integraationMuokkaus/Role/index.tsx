import type { Components } from "@/api";
import { getRole } from "../../home/IntegrationsTable";
import IdentityProvider from "./IdentityProvider";
import ServiceProvider from "./ServiceProvider";
import SetProvider from "./SetProvider";
import type { Dispatch, MutableRefObject } from "react";
import { devLog } from "@/utils/devLog";



interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: MutableRefObject<number>;
  name: string;
  attributes?: Components.Schemas.Attribute[];
  setName: Dispatch<string>;
  setCanSave: Dispatch<boolean>;
  setEnvironment: Dispatch<number>;
  setMetadataUrl: Dispatch<string>;
}

const roleComponents = {
  idp: IdentityProvider,
  sp: ServiceProvider,
  set: SetProvider
};

export default function Role({ integration, oid, environment, setName, setCanSave, name, attributes,setEnvironment,setMetadataUrl }: Props) {
  const role = getRole(integration);

  const Component = roleComponents[role];

  const canSave = (value: boolean) => {
    devLog("DEBUG","Role (setCanSave)",value)
    setCanSave(value)
  }

  const tenantId: Components.Schemas.Attribute=attributes?.find(att=>att.name==='tenantId')||{}
  devLog("DEBUG","Role (tenantId)",tenantId?.content)

  return (
    <>
      <Component integration={integration} oid={oid} environment={environment} setEnvironment={setEnvironment} setName={setName} setCanSave={canSave} name={name} tenantId={tenantId?.content || ''} setMetadataUrl={setMetadataUrl}/>
    </>
  );
}
