import type { Components } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import _ from "lodash";
import {
  Alert,
  AlertTitle,
  Grid,
  Link as MuiLink,
  Typography
} from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useState } from "react";
import { FormattedMessage } from 'react-intl';
import { Link, useLocation } from "react-router-dom";
import Role from "./Role";
import { DataRow } from "../integraatio/IntegrationTab/DataRow";

import Metadata from "./Metadata";
import Attributes from "./Attributes";
import IntegrationBasicDetails from "./IntegrationBasicDetails";
import type { IntegrationType, UiConfiguration } from '../../config';
import { dataConfiguration, defaultDataConfiguration, defaultIntegrationType } from '../../config';

interface Props {
  id: number;
  setSaveDialogState: Dispatch<boolean>;
  setCanSave: Dispatch<boolean>;
  newIntegration?: Components.Schemas.Integration;
  setNewIntegration: Dispatch<Components.Schemas.Integration>;
}

export default function IntegrationDetails({ id, setSaveDialogState, setCanSave, setNewIntegration, newIntegration}: Props) {
    
    const [isValid, setIsValid] = useState(true);
    const [ newConfigurationEntityData, setNewConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity>();
    const [ showConfigurationEntityData, setShowConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity>();
    
    const { state } = useLocation();
    const integration: Components.Schemas.Integration = state;
    const role  = (integration.configurationEntity?.idp) ? "idp" : "sp"
    const type = integration.configurationEntity?.idp?.type! || integration.configurationEntity?.sp?.type! || "unknown"
    const oid: string = integration?.organization?.oid || "0"
    const environment:number = integration?.deploymentPhase || -5
    const uniqueIdConfiguration:UiConfiguration = dataConfiguration.filter(conf=>conf.name&&conf.name==='uniqueId')[0] || defaultDataConfiguration;
    const typeConf:IntegrationType = uniqueIdConfiguration.integrationType.filter(i=>i.name===type)[0] || defaultIntegrationType; 
    
    useEffect(() => {
     
      if(role !== undefined) {
        setNewIntegration(_.cloneDeep(integration))
        setNewConfigurationEntityData(_.cloneDeep(integration.configurationEntity))
      }
      
    }, [role, integration,setNewIntegration]);
    
    useEffect(() => {
       
      if(newConfigurationEntityData&&newConfigurationEntityData.idp&&type!=='unknown') {
        const updatedIdentityProvider: any = newConfigurationEntityData.idp;
        const uniqueIdType=newConfigurationEntityData.attributes?.filter(attribute=>attribute.name===typeConf.attribute).map(attribute=>attribute.content)[0]||''; 
        if(typeConf.attribute){
          updatedIdentityProvider[typeConf.attribute]=uniqueIdType;
          newConfigurationEntityData.idp=updatedIdentityProvider;
          setShowConfigurationEntityData(newConfigurationEntityData);
        }
      }

    }, [newConfigurationEntityData, type, typeConf.attribute, uniqueIdConfiguration.integrationType]);


    useEffect(() => {
          if(newConfigurationEntityData) {
            setSaveDialogState(true);
            if(_.isEqual(newConfigurationEntityData,integration.configurationEntity)){
              setCanSave(false)
            } else {    
              if(isValid) {                
                setCanSave(true)
              } else {
                setCanSave(false)
              }
              if(newIntegration) {
                newIntegration.configurationEntity=newConfigurationEntityData
                setNewIntegration(newIntegration)
              }
            }
          } else {
              setSaveDialogState(false);  
          }
        
    }, [newConfigurationEntityData, integration, setCanSave, setSaveDialogState, isValid, newIntegration, setNewIntegration]);

    var hasAttributes =
                role === "idp" &&
                !["opinsys", "wilma"].includes(
                  integration.configurationEntity?.[role]?.type!
                );

    if(integration) {
      
      return(<>
      
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

        {(role === "idp" || role === "sp" ) && integration && showConfigurationEntityData && (
          <IntegrationBasicDetails integration={integration} configurationEntity={showConfigurationEntityData} />
        )}    
        <Role integration={integration} oid={oid} environment={environment} setCanSave={setIsValid}/>

        {newConfigurationEntityData&&<Metadata
          newConfigurationEntityData={newConfigurationEntityData}
          setNewConfigurationEntityData={setNewConfigurationEntityData}
          configurationEntity={integration.configurationEntity!}
          role={role}
          type={type}
          setCanSave={setIsValid}
        />}

        {newConfigurationEntityData && <Grid mb={hasAttributes ? 3 : undefined}>
          <ErrorBoundary>
            <Attributes
              newConfigurationEntityData={newConfigurationEntityData}
              setNewConfigurationEntityData={setNewConfigurationEntityData}  
              attributes={newConfigurationEntityData?.attributes ?? []}
              attributeType="data"
              environment={environment}
              type={type}
              role={role}
              oid={oid}
              setCanSave={setIsValid}
            />
          </ErrorBoundary>
        </Grid>}
        
        {hasAttributes && newConfigurationEntityData &&(
          <>
            <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Attribuutit" />
            </Typography>
            <ErrorBoundary>
              <Attributes
                newConfigurationEntityData={newConfigurationEntityData}
                setNewConfigurationEntityData={setNewConfigurationEntityData}  
                attributes={newConfigurationEntityData?.attributes ?? []}
                role={role}
                attributeType="user"
                environment={environment}
                type={type}
                oid={oid}
                setCanSave={setIsValid}
              />
            </ErrorBoundary>
              
          </>
        )}
        
      </>)
    } else {
      return (
        <Alert severity="error">
          <FormattedMessage
            defaultMessage="<title>Integraatiota {id} ei löydy</title>Siirry <link>etusivulle</link>."
            values={{
              id,
              title: (chunks) => <AlertTitle>{chunks}</AlertTitle>,
              link: (chunks) => (
                <MuiLink color="error" component={Link} to="/">
                  {chunks}
                </MuiLink>
              ),
            }}
          />
        </Alert>
      );
    }
}