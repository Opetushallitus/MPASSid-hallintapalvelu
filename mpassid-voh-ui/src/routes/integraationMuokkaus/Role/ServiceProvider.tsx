import { Grid, Typography } from "@mui/material";
import type { Components } from "@/api";
import { useParams } from "react-router-dom";
import { FormattedMessage } from 'react-intl';
import { DataRow, DataRowProps } from "@/routes/integraatio/IntegrationTab/DataRow";
import Role from "@/routes/integraationMuokkaus/Role";
import Metadata from "@/routes/integraatio/IntegrationTab/IntegrationDetails/Metadata";
import ErrorBoundary from "@/components/ErrorBoundary";
import Attributes from "@/routes/integraationMuokkaus/Attributes";
import {
    getRole,
    typeAbbreviations,
    typeTooltips,
  } from "@/routes/home/IntegrationsTable";
import UniqueId from "@/routes/integraationMuokkaus/UniqueId";
import { useIntegrationSafe } from "@/api/client";

interface Props {
  integration: Components.Schemas.Integration;
}

export default function PalveluIntegraatio({ integration }: Props) {
    const { integrationType } = useParams();
    const { type } = useParams();
    const hasAttributes = false ;
    const role = "sp";
    

    if(integrationType==='Palveluintegraatio') {
        return(<>
            Oma palvelu vs Lisäys olemassa olevaan palveluun
            <br></br>
            Palvelun nimi
            <br></br>
            {type} integraation liittyvät kentät
            
            <Typography component={"div"} variant="h2" gutterBottom >
        <FormattedMessage defaultMessage="Organisaation tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <DataRow object={integrationType} path="organization.name" />
        <DataRow object={integrationType} path="organization.oid" />
        <DataRow object={integrationType} path="organization.ytunnus" />
      </Grid>

      

      
        <>
            <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Integraation perustiedot" />
            </Typography>

            <Grid container spacing={2} mb={3}>
              
              
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
              <Grid item xs={4}>
                <FormattedMessage defaultMessage="Palveluryhmä" />
              </Grid>
              <Grid item xs={8}>
                <span>Drop down valikko, josta voi valita uuden palvelun tai sallitut olemmassaolevat </span>
              </Grid>
            </Grid>
          </>
         
      <Role integration={integration} />

      <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Metadatatiedot" />
    </Typography>
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
        </>)
        
    } else {
        return(<></>)
    }
}

export function UniqueIdValue({ name, label, children }: DataRowProps) {
    return (
      <>
        {(children as JSX.Element)?.props?.value ? children : "–"} (
        <span>{label ? <FormattedMessage {...label} /> : name}</span>)
      </>
    );
  }