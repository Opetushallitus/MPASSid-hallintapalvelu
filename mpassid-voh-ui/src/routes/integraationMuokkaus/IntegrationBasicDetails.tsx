import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from 'react-intl';
import type { DataRowProps } from '../integraatio/IntegrationTab/DataRow';
import { DataRow } from '../integraatio/IntegrationTab/DataRow';
import {
    typeAbbreviations,
    typeTooltips,
  } from "@/routes/home/IntegrationsTable";
import UniqueId from "./UniqueId";


interface Props {
    integration: Components.Schemas.Integration;
    configurationEntity: Components.Schemas.ConfigurationEntity;
}
  
export default function IntegrationBasicDetails({ integration, configurationEntity }: Props) {

    const role  = (configurationEntity?.idp) ? "idp" : "sp"

    return(
        <>
              <Typography variant="h2" gutterBottom>
                <FormattedMessage defaultMessage="Integraation perustiedot" />
              </Typography>

              <Grid container spacing={2} mb={3}>
                {integration.id!==0&&<DataRow object={integration} path="id" />}
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
                  {configurationEntity&&<UniqueId
                    configurationEntity={configurationEntity!}
                    role={role}
                    ValueComponent={UniqueIdValue}
                  />}
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