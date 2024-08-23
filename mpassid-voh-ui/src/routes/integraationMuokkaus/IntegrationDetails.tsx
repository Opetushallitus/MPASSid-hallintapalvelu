import type { Components } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import { clone, cloneDeep, isEqual } from "lodash";
import {
  Alert,
  AlertTitle,
  Grid,
  Link as MuiLink,
  Typography
} from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage } from 'react-intl';
import { Link, useLocation } from "react-router-dom";
import Role from "./Role";
import { DataRow } from "../integraatio/IntegrationTab/DataRow";

import Metadata from "./Metadata";
import Attributes from "./Attributes";
import IntegrationBasicDetails from "./IntegrationBasicDetails";
import type { IntegrationType, UiConfiguration } from '../../config';
import { dataConfiguration, defaultDataConfiguration, defaultIntegrationType } from '../../config';
import SchoolSelection from "./SchoolSelection";

interface Props {
  id: number;
  setSaveDialogState: Dispatch<boolean>;
  setCanSave: Dispatch<boolean>;
  newIntegration?: Components.Schemas.Integration;
  setNewIntegration: Dispatch<Components.Schemas.Integration>;
  setLogo: Dispatch<Blob>;
}

export default function IntegrationDetails({ id, setSaveDialogState, setCanSave, setNewIntegration, newIntegration, setLogo }: Props) {
    
    const [isValidSchoolSelection, setIsValidSchoolSelection] = useState(true);
    const [isValidDataAttribute, setIsValidDataAttribute] = useState(true);
    const [isValidUserAttribute, setIsValidUserAttribute] = useState(true);
    const [isValidMetadata, setIsValidMetadata] = useState(true);
    const [newLogo, setNewLogo] = useState(false);
    const [ newConfigurationEntityData, setNewConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity>();
    const [ newDiscoveryInformation, setNewDiscoveryInformation] = useState<Components.Schemas.DiscoveryInformation>();
    const [ showConfigurationEntityData, setShowConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity>();
    const environment = useRef<number>(1);
    const originalEnvironment = useRef<number>(-5);
    const [newEnvironment, setNewEnvironment] = useState(false);
    
    
    const { state } = useLocation();
    const integration: Components.Schemas.Integration = state;
    const role  = (integration.configurationEntity?.idp) ? "idp" : "sp"
    const type = integration.configurationEntity?.idp?.type! || integration.configurationEntity?.sp?.type! || "unknown"
    const oid: string = integration?.organization?.oid || "0"
    //const environment:number = integration?.deploymentPhase || -5
    const uniqueIdConfiguration:UiConfiguration = dataConfiguration.filter(conf=>conf.name&&conf.name==='uniqueId')[0] || defaultDataConfiguration;
    const typeConf:IntegrationType = uniqueIdConfiguration.integrationType.filter(i=>i.name===type)[0] || defaultIntegrationType; 
    
    
    
    useEffect(() => {
      
      if(integration.deploymentPhase) {
        environment.current=integration.deploymentPhase
        if(originalEnvironment.current===-5) {
          originalEnvironment.current=integration.deploymentPhase
        }
      }

      
      
    }, [integration]);
    
    useEffect(() => {
      
      if(role !== undefined) {
        integration.deploymentPhase=environment.current
        setNewIntegration(cloneDeep(integration))
        setNewConfigurationEntityData(cloneDeep(integration.configurationEntity))
        if(integration?.discoveryInformation){
          setNewDiscoveryInformation(cloneDeep(integration.discoveryInformation))
        }
        
      }
      
    }, [role, integration, setNewIntegration,newEnvironment]);
    
    useEffect(() => {
      if(newConfigurationEntityData&&type!=='unknown') {
        
        const uniqueIdType=newConfigurationEntityData.attributes?.filter(attribute=>attribute.name===typeConf.attribute).map(attribute=>attribute.content)[0]||''; 
        if(typeConf.attribute&&newConfigurationEntityData.idp){
          const updatedIdentityProvider: any = newConfigurationEntityData.idp;
          updatedIdentityProvider[typeConf.attribute]=uniqueIdType;
          newConfigurationEntityData.idp=updatedIdentityProvider;
          setShowConfigurationEntityData(newConfigurationEntityData);
        }
        if(typeConf.attribute&&newConfigurationEntityData.sp){
          const updatedServiceProvider: any = newConfigurationEntityData.sp;
          updatedServiceProvider[typeConf.attribute]=uniqueIdType;
          newConfigurationEntityData.sp=updatedServiceProvider;
          setShowConfigurationEntityData(newConfigurationEntityData);
        }
      }

    }, [newConfigurationEntityData, type, typeConf.attribute, uniqueIdConfiguration.integrationType]);


    useEffect(() => {

          if(newConfigurationEntityData) {
            const isValid=isValidDataAttribute&&isValidUserAttribute&&isValidMetadata&&isValidSchoolSelection;        
            const logoOK=(role==='sp'||
                          newLogo||
                          (newConfigurationEntityData?.idp?.logoUrl !== undefined && newConfigurationEntityData?.idp?.logoUrl !== '') 
        )

            setSaveDialogState(true);
            if(isEqual(newConfigurationEntityData,integration.configurationEntity)){       
              if(newDiscoveryInformation&&(!isEqual(newDiscoveryInformation,integration?.discoveryInformation)||newLogo||(originalEnvironment.current!==environment.current))&&isValid&&logoOK) {      
                setCanSave(true)
              } else {
                setCanSave(false)
              }       
            } else {                      
              if(isValid&&logoOK) {         
                setCanSave(true)
              } else {
                setCanSave(false)
              }
              if(integration) {            
                var changedIntegration=clone(integration)
                changedIntegration.discoveryInformation=newDiscoveryInformation
                changedIntegration.configurationEntity=newConfigurationEntityData
                changedIntegration.deploymentPhase=environment.current
                setNewIntegration(changedIntegration)
              }
            }
          } else {
              setSaveDialogState(false);  
          }
        
    }, [newConfigurationEntityData, integration, setCanSave, setSaveDialogState, isValidDataAttribute,isValidUserAttribute,isValidMetadata,isValidSchoolSelection, setNewIntegration, newLogo, role, newDiscoveryInformation, newEnvironment]);

    useEffect(() => {
      
      if(newDiscoveryInformation !== undefined) {
        const isValid=isValidDataAttribute&&isValidUserAttribute&&isValidMetadata&&isValidSchoolSelection;
        const logoOK=(role==='sp'||
                          newLogo||
                          (newConfigurationEntityData?.idp?.logoUrl !== undefined && newConfigurationEntityData?.idp?.logoUrl !== '') 
        )
        
        setSaveDialogState(true);
        if(isEqual(newDiscoveryInformation,integration?.discoveryInformation)){           
          if(newConfigurationEntityData !== undefined&&(!isEqual(newConfigurationEntityData,integration.configurationEntity)||newLogo||(originalEnvironment.current!==environment.current))&&logoOK&&isValid) {
            setCanSave(true)
          } else {
            setCanSave(false)
          }  
        } else {               
          if(isValid) {                
            setCanSave(true)
          } else {
            setCanSave(false)
          }
          if(integration) {            
            var changedIntegration=clone(integration)
            changedIntegration.discoveryInformation=newDiscoveryInformation
            changedIntegration.configurationEntity=newConfigurationEntityData
            changedIntegration.deploymentPhase=environment.current
            setNewIntegration(changedIntegration)
          }
        }
      } else {
          setSaveDialogState(false);  
      }
    
}, [newDiscoveryInformation, integration, setCanSave, setSaveDialogState, isValidSchoolSelection, setNewIntegration, newConfigurationEntityData, role, newLogo, isValidDataAttribute, isValidUserAttribute, isValidMetadata,newEnvironment]);

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
        </Grid>
        {role === "idp" && type === "wilma" && newConfigurationEntityData && newDiscoveryInformation &&
            (<SchoolSelection 
                integration={integration} 
                setConfigurationEntity={setNewConfigurationEntityData} 
                configurationEntity={newConfigurationEntityData} 
                discoveryInformation={newDiscoveryInformation} 
                setDiscoveryInformation={setNewDiscoveryInformation} 
                setCanSave={setIsValidSchoolSelection}
                setLogo={setLogo}
                newLogo={newLogo}
                setNewLogo={setNewLogo}
                isEditable={true}/>
              )
          }
        {role === "idp" && type !== "wilma" && newConfigurationEntityData && newDiscoveryInformation &&
            (<SchoolSelection 
                integration={integration} 
                setConfigurationEntity={setNewConfigurationEntityData} 
                configurationEntity={newConfigurationEntityData} 
                discoveryInformation={newDiscoveryInformation} 
                setDiscoveryInformation={setNewDiscoveryInformation}
                setCanSave={setIsValidSchoolSelection}
                setLogo={setLogo}
                newLogo={newLogo}
                setNewLogo={setNewLogo}
                isEditable={false}/>
            )
          }

        {(role === "idp" || role === "sp" ) && integration && showConfigurationEntityData &&(
          <IntegrationBasicDetails integration={integration} configurationEntity={showConfigurationEntityData} environment={environment} setNewEnvironment={setNewEnvironment} newEnvironment={newEnvironment}/>
        )}    
        
        <Role integration={integration} oid={oid} environment={environment.current} />

        {newConfigurationEntityData && <Grid mb={hasAttributes ? 3 : undefined}>
          <ErrorBoundary>
            <Attributes
              newConfigurationEntityData={newConfigurationEntityData}
              setNewConfigurationEntityData={setNewConfigurationEntityData}  
              attributes={newConfigurationEntityData?.attributes ?? []}
              attributeType="data"
              environment={environment.current}
              type={type}
              role={role}
              oid={oid}
              setCanSave={setIsValidDataAttribute}
            />
          </ErrorBoundary>
        </Grid>}
        
        {newConfigurationEntityData&&role==='sp'&&
        <>
        <Typography variant="h2" gutterBottom>
          <FormattedMessage defaultMessage="Palvelun metadata tiedot" />
        </Typography>
        <Metadata
          newConfigurationEntityData={newConfigurationEntityData}
          setNewConfigurationEntityData={setNewConfigurationEntityData}
          configurationEntity={integration.configurationEntity!}
          role={role}
          type={type}
          setCanSave={setIsValidMetadata}
          oid={oid}
          environment={environment.current}
        />
        </>}

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
                environment={environment.current}
                type={type}
                oid={oid}
                setCanSave={setIsValidUserAttribute}
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