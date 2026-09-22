import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from 'react-intl';
import type { DataRowProps } from '../integraatio/IntegrationTab/DataRow';
import { DataRow } from '../integraatio/IntegrationTab/DataRow';
import {
    typeAbbreviations,
    typeTooltips,
  } from "@/routes/home/IntegrationsTable";
import UniqueId from "./UniqueId";
import type { JSX, MutableRefObject} from "react";

interface Props {
    integration: Components.Schemas.Integration;
    environment: MutableRefObject<number>;
    configurationEntity: Components.Schemas.ConfigurationEntity;
    metadata?: any;
}
  
export default function IntegrationBasicDetails({ integration, configurationEntity }: Props) {

    const intl = useIntl();
    const role  = (configurationEntity?.idp) ? "idp" : "sp"
    
    return(
        <>
              <Typography variant="h2" gutterBottom>
                <FormattedMessage defaultMessage="Integraation perustiedot" />
              </Typography>

              <Grid container size={12} spacing={2} sx={{ mb: 3 }}>
                {integration.id!==0&&<DataRow object={integration} path="id" />}
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
                  {configurationEntity&&<UniqueId
                    configurationEntity={configurationEntity!}
                    role={role}
                    ValueComponent={UniqueIdValue}
                  />}
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
    )
  
}

export function UniqueIdValue({ name, label, children }: DataRowProps) {
  
    return (
      <>
        {(children as JSX.Element)?.props?.value ? children : "–"} (
        <span>{label ? <FormattedMessage {...label} /> : name}</span>)
      </>
    );
  }