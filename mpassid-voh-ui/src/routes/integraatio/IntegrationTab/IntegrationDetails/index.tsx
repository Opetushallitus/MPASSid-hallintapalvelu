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
    
    //Tuki ainoastaan azure palveluille 
    if((integration?.configurationEntity?.idp?.type === "azure" ||  integration?.configurationEntity?.idp?.type === "wilma") && integration.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+integration.organization.oid)||groups?.includes(tallentajaOphGroup))) {
      return true;
    } else {
      if((integration?.configurationEntity?.sp?.type === "saml" ||  integration?.configurationEntity?.sp?.type === "oidxz") && integration.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+integration.organization.oid)||groups?.includes("APP_MPASSID_PALVELU_TALLENTAJA_"+integration.organization.oid)||groups?.includes(tallentajaOphGroup))) {
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
                  
                {role === "sp" && (
                    <DataRow
                    object={integration}
                    path="integrationGroups"
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
