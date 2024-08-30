import type { Components } from "@/api";
import { getRole } from "../../home/IntegrationsTable";
import IdentityProvider from "./IdentityProvider";
import ServiceProvider from "./ServiceProvider";
import SetProvider from "./SetProvider";
import type { Dispatch } from "react";

interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: number;
  setName: Dispatch<string>;
}

const roleComponents = {
  idp: IdentityProvider,
  sp: ServiceProvider,
  set: SetProvider
};

export default function Role({ integration, oid, environment, setName }: Props) {
  const role = getRole(integration);

  const Component = roleComponents[role];

  return (
    <>
      <Component integration={integration} oid={oid} environment={environment} setName={setName}/>
    </>
  );
}
