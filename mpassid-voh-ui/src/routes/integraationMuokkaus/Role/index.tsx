import type { Components } from "@/api";
import { getRole } from "../../home/IntegrationsTable";
import IdentityProvider from "./IdentityProvider";
import ServiceProvider from "./ServiceProvider";
import SetProvider from "./SetProvider";

interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
}

const roleComponents = {
  idp: IdentityProvider,
  sp: ServiceProvider,
  set: SetProvider
};

export default function Role({ integration, oid }: Props) {
  const role = getRole(integration);

  const Component = roleComponents[role];

  return (
    <>
      <Component integration={integration} oid={oid}/>
    </>
  );
}
