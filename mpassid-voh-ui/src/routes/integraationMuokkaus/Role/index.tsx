import type { Components } from "@/api";
import { getRole } from "../../home/IntegrationsTable";
import IdentityProvider from "./IdentityProvider";
import ServiceProvider from "./ServiceProvider";
import SetProvider from "./SetProvider";
import type { Dispatch, MutableRefObject } from "react";
import { devLog } from "@/utils/devLog";
import { dataConfiguration } from "@/config";



interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: MutableRefObject<number>;
  name: string;
  attributes?: Components.Schemas.Attribute[];
  metadataUrl: string;
  metadataFile: File[];
  setName: Dispatch<string>;
  setCanSave: Dispatch<boolean>;
  setEnvironment: Dispatch<number>;
  setMetadataUrl: Dispatch<string>;
  setMetadataFile: Dispatch<File[]>;
}

const roleComponents = {
  idp: IdentityProvider,
  sp: ServiceProvider,
  set: SetProvider
};

export default function Role({ integration, oid, environment, setName, setCanSave, name, attributes,setEnvironment,setMetadataUrl,metadataUrl,metadataFile, setMetadataFile }: Props) {
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
      <Component 
              dataConfiguration={dataConfiguration}
              integration={integration} 
              oid={oid} 
              environment={environment} 
              setEnvironment={setEnvironment} 
              setName={setName} 
              setCanSave={canSave} 
              name={name} 
              tenantId={tenantId?.content || ''} 
              setMetadataUrl={setMetadataUrl} 
              metadataUrl={metadataUrl}
              setMetadataFile={setMetadataFile} 
              metadataFile={metadataFile}/>
    </>
  );
}
