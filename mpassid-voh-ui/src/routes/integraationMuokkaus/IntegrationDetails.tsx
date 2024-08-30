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
import { devLog } from "@/utils/devLog";

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
    const environment = useRef<number>(-5);
    const originalEnvironment = useRef<number>(-5);
    const [newEnvironment, setNewEnvironment] = useState(false);
    const [name, setName] = useState<string>('');
    const [metadata, setMetadata] = useState<any>(newConfigurationEntityData?.sp?.metadata||{});
    
    const { state } = useLocation();
    const integration: Components.Schemas.Integration = state;
    const role  = (integration.configurationEntity?.idp) ? "idp" : "sp"
    const type = integration.configurationEntity?.idp?.type! || integration.configurationEntity?.sp?.type! || "unknown"
    const oid: string = integration?.organization?.oid || "0"
    //const environment:number = integration?.deploymentPhase || -5
    const uniqueIdConfiguration:UiConfiguration = dataConfiguration.filter(conf=>conf.name&&conf.name==='uniqueId')[0] || defaultDataConfiguration;
    const typeConf:IntegrationType = uniqueIdConfiguration.integrationType.filter(i=>i.name===type)[0] || defaultIntegrationType; 
    
    
    
    useEffect(() => {
      devLog("IntegrationDetails (integration)",integration)
      if(integration?.configurationEntity?.sp?.name) {
        setName(integration.configurationEntity.sp.name)
      }
      if(integration.deploymentPhase) {
        environment.current=integration.deploymentPhase
        if(originalEnvironment.current===-5) {
          devLog("IntegrationDetails (originalEnvironment)",integration.deploymentPhase)
          originalEnvironment.current=integration.deploymentPhase
        }
      } 
      
    }, [integration]);
    
    useEffect(() => {
      
      if(role !== undefined) {
        devLog("IntegrationDetails (deploymentPhase)",integration.deploymentPhase)
        devLog("IntegrationDetails (environment)",environment.current)
        if(environment.current>=0) {
          integration.deploymentPhase=environment.current
        }
        
        setNewIntegration(cloneDeep(integration))
        setNewConfigurationEntityData(cloneDeep(integration.configurationEntity))
        if(integration?.discoveryInformation){
          setNewDiscoveryInformation(cloneDeep(integration.discoveryInformation))
        }
        if(integration?.configurationEntity) {
          if(integration.configurationEntity.sp&&integration.configurationEntity.sp.metadata) {
            setMetadata(integration.configurationEntity.sp.metadata)
          }
        }
        
      }
      
    }, [role, integration, setNewIntegration,newEnvironment, setMetadata]);
    
    useEffect(() => {
      if(newConfigurationEntityData&&type!=='unknown') {
        
        const testNewConfigurationEntityData:any=clone(newConfigurationEntityData);
        
        if(typeConf.attribute&&testNewConfigurationEntityData.idp){
          const uniqueIdType=newConfigurationEntityData.attributes?.filter(attribute=>attribute.name===typeConf.attribute).map(attribute=>attribute.content)[0]||testNewConfigurationEntityData.idp?.[typeConf.attribute]||''; 
          devLog("uniqueIdType",uniqueIdType)
          const updatedIdentityProvider: any = testNewConfigurationEntityData.idp;
          devLog('updatedIdentityProvider[typeConf.attribute]',updatedIdentityProvider[typeConf.attribute])
          updatedIdentityProvider[typeConf.attribute]=uniqueIdType;
          newConfigurationEntityData.idp=updatedIdentityProvider;
          devLog("newConfigurationEntityData for show",newConfigurationEntityData)
          setShowConfigurationEntityData(newConfigurationEntityData);
        }
        if(typeConf.attribute&&testNewConfigurationEntityData.sp){
          const uniqueIdType=newConfigurationEntityData.attributes?.filter(attribute=>attribute.name===typeConf.attribute).map(attribute=>attribute.content)[0]||testNewConfigurationEntityData.idp?.[typeConf.attribute]||''; 
          devLog("uniqueIdType",uniqueIdType)
          const updatedServiceProvider: any = testNewConfigurationEntityData.sp;
          updatedServiceProvider[typeConf.attribute]=uniqueIdType;
          newConfigurationEntityData.sp=updatedServiceProvider;
          
          if(type==='saml') {
            if(metadata.entityId&&newConfigurationEntityData.sp) {
              const samlServiceProvider:Components.Schemas.SamlServiceProvider = cloneDeep(newConfigurationEntityData.sp)
              samlServiceProvider.entityId=metadata.entityId;
              const newConfiguration = cloneDeep(newConfigurationEntityData)
              newConfiguration.sp=samlServiceProvider;
              setShowConfigurationEntityData(newConfiguration)
            }
          }

          if(type==='oidc') {
            if(metadata.clientId&&newConfigurationEntityData.sp) {
              const oidcServiceProvider:Components.Schemas.OidcServiceProvider = cloneDeep(newConfigurationEntityData.sp)
              oidcServiceProvider.clientId=metadata.clientId;
              const newConfiguration = cloneDeep(newConfigurationEntityData)
              newConfiguration.sp=oidcServiceProvider;
              setShowConfigurationEntityData(newConfigurationEntityData);
            }
          }
          
          if(!metadata.entityId&&!metadata.clientId) {
            setShowConfigurationEntityData(newConfigurationEntityData);
          }
          
        }
      }

    }, [newConfigurationEntityData, type, typeConf.attribute, uniqueIdConfiguration.integrationType,metadata]);


    useEffect(() => {

          if(newConfigurationEntityData) {
            const isValid=isValidDataAttribute&&isValidUserAttribute&&isValidMetadata&&isValidSchoolSelection;
            devLog("isvalid newConfigurationEntityData (isValidDataAttribute)",isValidDataAttribute)
            devLog("isvalid newConfigurationEntityData (isValidUserAttribute)",isValidUserAttribute)
            devLog("isvalid newConfigurationEntityData (isValidMetadata)",isValidMetadata)
            devLog("isvalid newConfigurationEntityData (isValidSchoolSelection)",isValidSchoolSelection)
            
            const logoOK=(role==='sp'||
                          newLogo||
                          (newConfigurationEntityData?.idp?.logoUrl !== undefined && newConfigurationEntityData?.idp?.logoUrl !== '') 
        )

            setSaveDialogState(true);
            if(isEqual(newConfigurationEntityData,integration.configurationEntity)){       
              if(newDiscoveryInformation&&(!isEqual(newDiscoveryInformation,integration?.discoveryInformation)||newLogo||(originalEnvironment.current!==environment.current))&&isValid&&logoOK) {      
                devLog("setCanSave","1")
                
                setCanSave(true)
              } else {
                devLog("setCanSave","2")
                setCanSave(false)
              }       
            } else {                      
              if(isValid&&logoOK) {         
                devLog("setCanSave","3")
                setCanSave(true)
              } else {
                devLog("setCanSave","4")
                setCanSave(false)
              }
              if(integration) {            
                var changedIntegration=clone(integration)
                changedIntegration.discoveryInformation=newDiscoveryInformation
                changedIntegration.configurationEntity=newConfigurationEntityData
                changedIntegration.deploymentPhase=environment.current
                if(role==='sp'&&integration.configurationEntity&&integration.configurationEntity.sp&&newConfigurationEntityData.sp&&integration.configurationEntity.sp.type==='saml') {
                  const samlSP:Components.Schemas.SamlServiceProvider = clone(newConfigurationEntityData.sp);
                  samlSP.entityId=metadata.entityId;
                  changedIntegration.configurationEntity.sp=samlSP
                }
                if(changedIntegration?.discoveryInformation&&changedIntegration.discoveryInformation?.showSchools&&(changedIntegration.discoveryInformation.title===''||changedIntegration.discoveryInformation.title===undefined)) {
                  if(changedIntegration?.organization?.name) {
                    changedIntegration.discoveryInformation.title=changedIntegration?.organization?.name;
                  }
                }
                setNewIntegration(changedIntegration)
              }
            }
          } else {
              setSaveDialogState(false);  
          }
        
    }, [newConfigurationEntityData, integration, setCanSave, setSaveDialogState, isValidDataAttribute,isValidUserAttribute,isValidMetadata,isValidSchoolSelection, setNewIntegration, newLogo, role, newDiscoveryInformation, newEnvironment,metadata]);

    useEffect(() => {
      
      if(newDiscoveryInformation !== undefined) {
        const isValid=isValidDataAttribute&&isValidUserAttribute&&isValidMetadata&&isValidSchoolSelection;
        devLog("isvalid newDiscoveryInformation (isValidDataAttribute)",isValidDataAttribute)
            devLog("isvalid newDiscoveryInformation (isValidUserAttribute)",isValidUserAttribute)
            devLog("isvalid newDiscoveryInformation (isValidMetadata)",isValidMetadata)
            devLog("isvalid newDiscoveryInformation (isValidSchoolSelection)",isValidSchoolSelection)
        
        const logoOK=(role==='sp'||
                          newLogo||
                          (newConfigurationEntityData?.idp?.logoUrl !== undefined && newConfigurationEntityData?.idp?.logoUrl !== '') 
        )
        setSaveDialogState(true);
        if(isEqual(newDiscoveryInformation,integration?.discoveryInformation)){     
          if(newConfigurationEntityData !== undefined&&(!isEqual(newConfigurationEntityData,integration.configurationEntity)||newLogo||(originalEnvironment.current!==environment.current))&&logoOK&&isValid) {
            devLog("setCanSave","5")
            setCanSave(true)
          } else {
            devLog("setCanSave","6")
            setCanSave(false)
          }  
        } else {               
          if(isValid) {                
            devLog("setCanSave","7")
            setCanSave(true)
          } else {
            devLog("setCanSave","8")
            setCanSave(false)
          }
          if(integration) {            
            var changedIntegration=clone(integration)
            changedIntegration.discoveryInformation=newDiscoveryInformation
            changedIntegration.configurationEntity=newConfigurationEntityData
            changedIntegration.deploymentPhase=environment.current
            if(changedIntegration?.discoveryInformation&&changedIntegration.discoveryInformation?.showSchools&&(changedIntegration.discoveryInformation.title===''||changedIntegration.discoveryInformation.title===undefined)) {
              if(changedIntegration?.organization?.name) {
                changedIntegration.discoveryInformation.title=changedIntegration?.organization?.name;
              }
            }
            setNewIntegration(changedIntegration)
          }
        }
      } else {
  
          if(role==='idp') {
            setSaveDialogState(false);  
          }
          
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
          <IntegrationBasicDetails integration={integration} configurationEntity={showConfigurationEntityData} environment={environment} setNewEnvironment={setNewEnvironment} newEnvironment={newEnvironment} metadata={metadata}/>
        )}    
        
        <Role integration={integration} oid={oid} environment={environment.current} setName={setName}/>

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
          environment={integration.deploymentPhase||-5}
          metadata={metadata}
          setMetadata={setMetadata}
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