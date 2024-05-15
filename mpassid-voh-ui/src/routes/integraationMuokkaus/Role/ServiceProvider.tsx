import { Grid, Typography } from "@mui/material";
import type { Components } from "@/api";
import { useParams } from "react-router-dom";
import _ from "lodash";
import { FormattedMessage } from 'react-intl';
import type { DataRowProps } from "@/routes/integraatio/IntegrationTab/DataRow";
import { DataRow } from "@/routes/integraatio/IntegrationTab/DataRow";
import Role from "@/routes/integraationMuokkaus/Role";
import Metadata from "@/routes/integraatio/IntegrationTab/IntegrationDetails/Metadata";
import ErrorBoundary from "@/components/ErrorBoundary";
import Attributes from "@/routes/integraationMuokkaus/Attributes";
import UniqueId from "@/routes/integraationMuokkaus/UniqueId";
import type { Dispatch} from "react";
import { useEffect, useState } from "react";

interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: number;
  setCanSave: Dispatch<boolean>;
}

export default function PalveluIntegraatio({ integration,oid,environment,setCanSave }: Props) {
    const { integrationType } = useParams();
    const { type } = useParams();
    const hasAttributes = false ;
    const role = "sp";
    const [ newConfigurationEntityData, setNewConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity>();
    

    useEffect(() => {
      
      setNewConfigurationEntityData(_.cloneDeep(integration.configurationEntity))
      
      
    }, [integration]);

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
         
      <Role integration={integration} oid={oid} environment={environment} setCanSave={setCanSave}/>

      <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Metadatatiedot" />
    </Typography>
      <Metadata
        configurationEntity={integration.configurationEntity!}
        role={role}
      />

      {newConfigurationEntityData&&(<Grid mb={hasAttributes ? 3 : undefined}>
        <ErrorBoundary>
          <Attributes
            newConfigurationEntityData={newConfigurationEntityData}
            setNewConfigurationEntityData={setNewConfigurationEntityData} 
            attributes={integration.configurationEntity?.attributes ?? []}
            type={type}
            attributeType="data"
            role={role}
            oid={oid}
            environment={environment}
            setCanSave={setCanSave}
          />
        </ErrorBoundary>
      </Grid>)}
      
      {hasAttributes && newConfigurationEntityData &&(
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Attribuutit" />
          </Typography>
          <ErrorBoundary>
            <Attributes
              newConfigurationEntityData={newConfigurationEntityData}
              setNewConfigurationEntityData={setNewConfigurationEntityData} 
              attributes={integration.configurationEntity?.attributes ?? []}
              type={type}
              attributeType="user"
              role={role}
              oid={oid}
              environment={environment}
              setCanSave={setCanSave}
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