import type { Components } from "@/api";
import { useMe } from "@/api/käyttöoikeus";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  getRole,
  typeAbbreviations,
  typeTooltips,
} from "@/routes/home/IntegrationsTable";
import {
  Grid,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import Attributes from "./Attributes";
import type { DataRowProps } from "../DataRow";
import { DataRow } from "../DataRow";
import Metadata from "./Metadata";
import Role from "./Role";
import UniqueId from "./UniqueId";
import EditIntegrationButton from "./EditIntegrationButton";
import { tallentajaOphGroup } from '../../../../config';
import { useEffect, useState } from "react";
import { fixPackage } from '@/config';
import { defaults } from "@/routes/home/NewIntegrationSelection";
import { clone } from "lodash";

export const integrationTypes = clone(defaults);

if(fixPackage) {
  integrationTypes.typesPI = [ "saml", "oidc" ];
  integrationTypes.typesOKJ = [ "wilma", "azure" ];
} else {
  //Note: Currently only azure can be modified, but new azure integration cannot be created
  integrationTypes.typesOKJ.push("azure")
}
interface Props {
  integration: Components.Schemas.Integration;
}

export default function IntegrationDetails({ integration }: Props) {
  const me = useMe();
  const [groups, setGroups] = useState<string[]>();
  
  

  useEffect(() => {
    if(me?.groups) {
      setGroups(me.groups)
    }
  }, [me]);
  
  const writeAccess = () => {
    
    if(integration?.configurationEntity?.idp?.type && integration?.configurationEntity?.idp?.type!=="" && integrationTypes.typesOKJ.includes(integration?.configurationEntity?.idp?.type)  && integration.organization?.oid!=null && (groups?.includes("APP_MPASSID_TALLENTAJA_"+integration.organization.oid)||groups?.includes(tallentajaOphGroup))) {
      return true;
    } else {
      if(integration?.configurationEntity?.sp?.type && integration?.configurationEntity?.sp?.type !== "" && integrationTypes.typesPI.includes(integration?.configurationEntity?.sp?.type) && integration.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+integration.organization.oid)||groups?.includes("APP_MPASSID_PALVELU_TALLENTAJA_"+integration.organization.oid)||groups?.includes(tallentajaOphGroup))) {
        return true
      }
    }
    return false;
  }

  const role = getRole(integration);

  const hasAttributes =
    role === "idp" &&
    !["opinsys", "wilma"].includes(
      integration.configurationEntity?.[role]?.type!
    );

  return (
    <>
    
      <Typography component={"div"} variant="h2" gutterBottom >
        <FormattedMessage defaultMessage="Organisaation tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <DataRow object={integration} path="organization.name" />
        <DataRow object={integration} path="organization.oid" />
        <DataRow object={integration} path="organization.ytunnus" />
        {role === "idp" && (
          <DataRow
            object={integration}
            path="configurationEntity.idp.logoUrl"
            type="image"
          />
        )}
      </Grid>

      {role === "idp" && (
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
          </Typography>
          <Grid container spacing={2} mb={3}>
            <DataRow
              object={integration}
              path="discoveryInformation.customDisplayName"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.showSchools"
              type="boolean"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.schools"
              type="text-list"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.excludedSchools"
              type="text-list"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.title"
            />
          </Grid>
        </>
      )}

      {(role === "idp" || role === "sp" ) && (
        <>
            <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Integraation perustiedot" />
            </Typography>

            <Grid container spacing={2} mb={3}>
              <DataRow object={integration} path="id" />
              <Grid item xs={4}>
                <FormattedMessage defaultMessage="Jäsentyyppi" />
              </Grid>
              <Grid item xs={8}>
                <FormattedMessage {...typeAbbreviations[role]} /> (
                <FormattedMessage {...typeTooltips[role]} />)
              </Grid>
              <Grid item xs={4}>
                <FormattedMessage defaultMessage="Yksilöllinen tunniste" />
              </Grid>
              <Grid item xs={8}>
                <UniqueId
                  configurationEntity={integration.configurationEntity!}
                  role={role}
                  ValueComponent={UniqueIdValue}
                />
              </Grid>
                  
                {role === "sp" && false && (
                    <DataRow
                    object={integration}
                    path="integrationSets"
                    type="service-list"
                  />
                )}
            </Grid>
          </>
      )}    
      <Role integration={integration} />

      <Metadata
        configurationEntity={integration.configurationEntity!}
        role={role}
      />

      <Grid mb={hasAttributes ? 3 : undefined}>
        <ErrorBoundary>
          <Attributes
            attributes={integration.configurationEntity?.attributes ?? []}
            type="data"
          />
        </ErrorBoundary>
      </Grid>
      
      {hasAttributes && (
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Attribuutit" />
          </Typography>
          <ErrorBoundary>
            <Attributes
              attributes={integration.configurationEntity?.attributes ?? []}
              type="user"
            />
          </ErrorBoundary>
            
        </>
      )}
      {writeAccess()&&<EditIntegrationButton integration={integration}></EditIntegrationButton>}
    </>
  );
}

export function UniqueIdValue({ name, label, children }: DataRowProps) {
  return (
    <>
      {(children as JSX.Element)?.props?.value ? children : "–"} (
      <span>{label ? <FormattedMessage {...label} /> : name}</span>)
    </>
  );
}
