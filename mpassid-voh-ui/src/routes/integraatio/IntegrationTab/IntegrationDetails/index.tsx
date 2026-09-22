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
import type { JSX } from "react";
import { FormattedMessage } from "react-intl";
import Attributes from "./Attributes";
import type { DataRowProps } from "../DataRow";
import { DataRow } from "../DataRow";
import Metadata from "./Metadata";
import Role from "./Role";
import UniqueId from "./UniqueId";
import EditIntegrationButton from "./EditIntegrationButton";
import { integrationTypesDefault } from '../../../../config';
import { useEffect, useState } from "react";
import { clone } from "lodash";

export const integrationTypes = clone(integrationTypesDefault);

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
    
    if(integration?.configurationEntity?.idp?.type && integration?.configurationEntity?.idp?.type!=="" && integrationTypes.typesOKJ.includes(integration?.configurationEntity?.idp?.type)  && integration.organization?.oid!=null && (groups?.includes("APP_MPASSID_TALLENTAJA_"+integration.organization.oid))) {
      return true;
    } else {
      if(integration?.configurationEntity?.sp?.type && integration?.configurationEntity?.sp?.type !== "" && integrationTypes.typesPI.includes(integration?.configurationEntity?.sp?.type) && integration.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+integration.organization.oid)||groups?.includes("APP_MPASSID_PALVELU_TALLENTAJA_"+integration.organization.oid))) {
        return true
      }
    }
    return false;
  }

  const role = getRole(integration);

  const hasAttributes =
    role === "idp" &&
    !["opinsys", "wilma", "adfs", "gsuite" ].includes(
      integration.configurationEntity?.[role]?.type!
    );

  return (
    <>
    
      <Typography component={"div"} variant="h2" gutterBottom >
        <FormattedMessage defaultMessage="Organisaation tiedot" />
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
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
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={4}>
              <FormattedMessage defaultMessage="Ympäristö" />
            </Grid>
            <Grid size={8}>
              <FormattedMessage
                defaultMessage={`{deploymentPhase, select,
                  0 {Testi}
                  1 {Tuotanto}
                  2 {Tuotanto-Testi}
                  other {Tuntematon}
                }`}
                values={{ deploymentPhase: integration.deploymentPhase }}
              />
            </Grid>
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

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <DataRow object={integration} path="id" />
              <Grid size={4}>
                <FormattedMessage defaultMessage="Jäsentyyppi" />
              </Grid>
              <Grid size={8}>
                <FormattedMessage {...typeAbbreviations[role]} /> (
                <FormattedMessage {...typeTooltips[role]} />)
              </Grid>
              <Grid size={4}>
                <FormattedMessage defaultMessage="Yksilöllinen tunniste" />
              </Grid>
              <Grid size={8}>
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

      <Grid sx={{ mb: hasAttributes ? 3 : undefined }}>
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
