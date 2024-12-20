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
import { useEffect, useRef, useState } from 'react';
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
    const [isValidRoleDetails, setIsValidRoleDetails] = useState(true);
    const [newLogo, setNewLogo] = useState(false);
    const [ newConfigurationEntityData, setNewConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity>();
    const [canSaveConfigurationEntity, setCanSaveConfigurationEntity] = useState(true);
    const [canSaveDiscoveryInformation, setCanSaveDiscoveryInformation] = useState(true);
    const [ newDiscoveryInformation, setNewDiscoveryInformation] = useState<Components.Schemas.DiscoveryInformation>();
    const [ showConfigurationEntityData, setShowConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity>();
    const environment = useRef<number>(-5);
    const originalEnvironment = useRef<number>(-5);
    const originalIntegration = useRef<Components.Schemas.Integration>();
    const [newEnvironment, setNewEnvironment] = useState(false);
    const [name, setName] = useState<string>('');
    const [metadata, setMetadata] = useState<any>((newConfigurationEntityData?.sp?.metadata&&newConfigurationEntityData?.sp?.metadata!==undefined)?newConfigurationEntityData.sp.metadata:{});
    const [attributes, setAttributes] = useState<any>((newConfigurationEntityData?.attributes&&newConfigurationEntityData?.attributes!==undefined)?newConfigurationEntityData.attributes:[]);
    
    const { state } = useLocation();
    const integration: Components.Schemas.Integration = state;
    const role  = (integration.configurationEntity?.idp) ? "idp" : "sp"
    const type = integration.configurationEntity?.idp?.type! || integration.configurationEntity?.sp?.type! || "unknown"
    const oid: string = integration?.organization?.oid || "0"
    
    const uniqueIdConfiguration:UiConfiguration = dataConfiguration.filter(conf=>conf.name&&conf.name==='uniqueId')[0] || defaultDataConfiguration;
    const typeConf:IntegrationType = uniqueIdConfiguration.integrationType.filter(i=>i.name===type)[0] || defaultIntegrationType; 
    
    useEffect(() => {
      devLog("DEBUG","IntegrationDetails (integration)",integration)
      if(integration?.configurationEntity?.sp?.name) {
        setName(integration.configurationEntity.sp.name)
      }
      if(integration.deploymentPhase) {
        environment.current=integration.deploymentPhase
        if(originalEnvironment.current===-5) {
          devLog("DEBUG","IntegrationDetails (originalEnvironment)",integration.deploymentPhase)
          originalEnvironment.current=integration.deploymentPhase
        }
      } 
      if(!originalIntegration.current) {
        devLog("DEBUG","IntegrationDetails (originalIntegration)",integration)
        originalIntegration.current=cloneDeep(integration)
      }
      
    }, [integration]);

    useEffect(() => {
      devLog("DEBUG","ServiceProvider (name)",name)
      devLog("DEBUG","ServiceProvider (isValidRoleDetails)",isValidRoleDetails)
      
    }, [name,isValidRoleDetails]);

    useEffect(() => {
      devLog("DEBUG","IntegrationDetails (canSaveConfigurationEntity)",canSaveConfigurationEntity)
      devLog("DEBUG","IntegrationDetails (canSaveDiscoveryInformation)",canSaveDiscoveryInformation)
      if(canSaveConfigurationEntity&&canSaveDiscoveryInformation) {
        setCanSave(true)
      } else {
        setCanSave(false)
      }
      
    }, [setCanSave,canSaveConfigurationEntity,canSaveDiscoveryInformation]);
    
    useEffect(() => {
      
      if(role !== undefined) {
        devLog("DEBUG","IntegrationDetails (deploymentPhase)",integration.deploymentPhase)
        devLog("DEBUG","IntegrationDetails (environment)",environment.current)
        if(environment.current>=0) {
          integration.deploymentPhase=environment.current
        }
        
        if(!newIntegration) {
          setNewIntegration(cloneDeep(integration))
        
          setNewConfigurationEntityData(cloneDeep(integration.configurationEntity))
          if(integration?.discoveryInformation){
            setNewDiscoveryInformation(cloneDeep(integration.discoveryInformation))
          }
          if(integration?.configurationEntity) {
            if(integration.configurationEntity.sp&&integration.configurationEntity.sp.metadata&&integration.configurationEntity.sp.metadata!==undefined) {
              setMetadata(integration.configurationEntity.sp.metadata)
            }
            if(integration.configurationEntity&&integration.configurationEntity.attributes&&integration.configurationEntity.attributes!== undefined) {              
              setAttributes(integration.configurationEntity.attributes)
            } 
            
          }
        }
        
        
      }
      
    }, [role, integration, newIntegration, setNewIntegration,newEnvironment, setMetadata]);
    
    useEffect(() => {

      //Update showConfigurationEntityData
      if(newConfigurationEntityData&&type!=='unknown') {
        
        const testNewConfigurationEntityData:any=clone(newConfigurationEntityData);
        
        if(typeConf.attribute&&testNewConfigurationEntityData.idp){
          const uniqueIdType=newConfigurationEntityData.attributes?.filter(attribute=>attribute.name===typeConf.attribute).map(attribute=>attribute.content)[0]||testNewConfigurationEntityData.idp?.[typeConf.attribute]||''; 
          devLog("DEBUG","uniqueIdType",uniqueIdType)
          const updatedIdentityProvider: any = testNewConfigurationEntityData.idp;
          devLog('DEBUG','updatedIdentityProvider[typeConf.attribute]',updatedIdentityProvider[typeConf.attribute])
          updatedIdentityProvider[typeConf.attribute]=uniqueIdType;
          newConfigurationEntityData.idp=updatedIdentityProvider;
          devLog("DEBUG","newConfigurationEntityData for show",newConfigurationEntityData)
          setShowConfigurationEntityData(newConfigurationEntityData);
        }
        if(typeConf.attribute&&testNewConfigurationEntityData.sp){
          const uniqueIdType=newConfigurationEntityData.attributes?.filter(attribute=>attribute.name===typeConf.attribute).map(attribute=>attribute.content)[0]||testNewConfigurationEntityData.sp?.[typeConf.attribute]||''; 
          devLog("DEBUG","uniqueIdType",uniqueIdType)
          const updatedServiceProvider: any = testNewConfigurationEntityData.sp;
          updatedServiceProvider[typeConf.attribute]=uniqueIdType;
          newConfigurationEntityData.sp=updatedServiceProvider;
          
          if(type==='saml') {
            if(metadata.entityId&&newConfigurationEntityData.sp) {
              const samlServiceProvider:Components.Schemas.SamlServiceProvider = cloneDeep(newConfigurationEntityData.sp)
              samlServiceProvider.entityId=metadata.entityId;
              if(name) {
                devLog("DEBUG","newConfigurationEntityData (name)",name)
                samlServiceProvider.name=name;
              }
              const newConfiguration = cloneDeep(newConfigurationEntityData)
              newConfiguration.sp=samlServiceProvider;
              setShowConfigurationEntityData(newConfiguration)
            }
            
          }

          if(type==='oidc') {
            
            if(metadata.client_id&&newConfigurationEntityData.sp) {
              const oidcServiceProvider:Components.Schemas.OidcServiceProvider = cloneDeep(newConfigurationEntityData.sp)
              oidcServiceProvider.clientId=metadata.client_id;
              
              if(name) {
                devLog("DEBUG","newConfigurationEntityData (name)",name)
                oidcServiceProvider.name=name;
              }
              const newConfiguration = cloneDeep(newConfigurationEntityData)
              newConfiguration.sp=oidcServiceProvider;
              setShowConfigurationEntityData(newConfiguration);
            }
          }
          
          if(!metadata.entityId&&!metadata.client_id) {
            setShowConfigurationEntityData(newConfigurationEntityData);
          }
          
        }
      }

    }, [newConfigurationEntityData, type, typeConf.attribute, uniqueIdConfiguration.integrationType,metadata,name]);


    useEffect(() => {

        //Update newConfigurationEntityData
          if(newConfigurationEntityData) {
            const isValid=isValidDataAttribute&&isValidUserAttribute&&isValidMetadata&&isValidSchoolSelection&&isValidRoleDetails;
            devLog("DEBUG","isvalid newConfigurationEntityData (isValidDataAttribute)",isValidDataAttribute)
            devLog("DEBUG","isvalid newConfigurationEntityData (isValidUserAttribute)",isValidUserAttribute)
            devLog("DEBUG","isvalid newConfigurationEntityData (isValidMetadata)",isValidMetadata)
            devLog("DEBUG","isvalid newConfigurationEntityData (isValidSchoolSelection)",isValidSchoolSelection)
            devLog("DEBUG","isvalid newConfigurationEntityData (isValidRoleDetails)",isValidRoleDetails)
            
            const logoOK=(role==='sp'||
                          newLogo||
                          (newConfigurationEntityData?.idp?.logoUrl !== undefined && newConfigurationEntityData?.idp?.logoUrl !== '') 
        )

            setSaveDialogState(true);
            devLog("DEBUG","setCanSave (newConfigurationEntityData)",newConfigurationEntityData)
            devLog("DEBUG","setCanSave (originalIntegration.current?.configurationEntity)",originalIntegration.current?.configurationEntity)
            if(isEqual(newConfigurationEntityData,originalIntegration.current?.configurationEntity)){   
              devLog("DEBUG","setCanSave - ",(newConfigurationEntityData !== undefined))
              devLog("DEBUG","setCanSave - ",(!isEqual(newDiscoveryInformation,integration?.discoveryInformation)))  
              devLog("DEBUG","setCanSave - ",((newLogo)))    
              devLog("DEBUG","setCanSave - ",((originalEnvironment.current!==environment.current)))    
              devLog("DEBUG","setCanSave - ",isValid)    
              devLog("DEBUG","setCanSave - ",logoOK)    
              devLog("DEBUG","setCanSave - ",(!isEqual(newDiscoveryInformation,integration?.discoveryInformation)||newLogo||(originalEnvironment.current!==environment.current))&&isValid&&logoOK)    
              if(newDiscoveryInformation&&(!isEqual(newDiscoveryInformation,originalIntegration.current?.discoveryInformation)||newLogo||(originalEnvironment.current!==environment.current))&&isValid&&logoOK) {      
                devLog("DEBUG","setCanSave","1")
                setCanSaveConfigurationEntity(true)
              } else {
                devLog("DEBUG","setCanSave","2")
                setCanSaveConfigurationEntity(false)
              }       
            } else {                      
              if(isValid&&logoOK) {         
                devLog("DEBUG","setCanSave","3")
                setCanSaveConfigurationEntity(true)
              } else {
                devLog("DEBUG","setCanSave","4")
                setCanSaveConfigurationEntity(false)
              }
              if(integration) {            
                var changedIntegration=clone(integration)
                changedIntegration.discoveryInformation=newDiscoveryInformation
                changedIntegration.configurationEntity=newConfigurationEntityData
                if(environment.current>=0) {
                  changedIntegration.deploymentPhase=environment.current
                }            
                
                if(role==='sp'&&integration.configurationEntity&&integration.configurationEntity.sp&&newConfigurationEntityData.sp&&integration.configurationEntity.sp.type==='saml') {
                  const samlSP:Components.Schemas.SamlServiceProvider = clone(newConfigurationEntityData.sp);
                  samlSP.entityId=metadata.entityId;
                  samlSP.name=name;
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
        
    }, [newConfigurationEntityData, integration, setCanSaveConfigurationEntity, setSaveDialogState, isValidDataAttribute,isValidUserAttribute,isValidMetadata,isValidSchoolSelection,isValidRoleDetails, setNewIntegration, newLogo, role, newDiscoveryInformation, newEnvironment,metadata,name]);

    useEffect(() => {
      
      //Update newDiscoveryInformation
      if(newDiscoveryInformation !== undefined) {
        const isValid=isValidDataAttribute&&isValidUserAttribute&&isValidMetadata&&isValidSchoolSelection&&isValidRoleDetails;
        devLog("DEBUG","isvalid newDiscoveryInformation (isValidDataAttribute)",isValidDataAttribute)
        devLog("DEBUG","isvalid newDiscoveryInformation (isValidUserAttribute)",isValidUserAttribute)
        devLog("DEBUG","isvalid newDiscoveryInformation (isValidMetadata)",isValidMetadata)
        devLog("DEBUG","isvalid newDiscoveryInformation (isValidSchoolSelection)",isValidSchoolSelection)
        devLog("DEBUG","isvalid newDiscoveryInformation (isValidRoleDetails)",isValidRoleDetails)
            
        
        const logoOK=(role==='sp'||
                          newLogo||
                          (newConfigurationEntityData?.idp?.logoUrl !== undefined && newConfigurationEntityData?.idp?.logoUrl !== '') 
        )
        setSaveDialogState(true);
        devLog("DEBUG","setCanSave (newDiscoveryInformation)",newDiscoveryInformation)
        devLog("DEBUG","setCanSave (originalIntegration.current?.discoveryInformation)",originalIntegration.current?.discoveryInformation)
        if(isEqual(newDiscoveryInformation,originalIntegration.current?.discoveryInformation)){     
          devLog("DEBUG","setCanSave - ",(newConfigurationEntityData !== undefined))
          devLog("DEBUG","setCanSave - ",newConfigurationEntityData)
          devLog("DEBUG","setCanSave - ",originalIntegration.current?.configurationEntity)
          devLog("DEBUG","setCanSave - ",(!isEqual(newConfigurationEntityData,originalIntegration.current?.configurationEntity)))
          if(newConfigurationEntityData !== undefined&&(!isEqual(newConfigurationEntityData,originalIntegration.current?.configurationEntity)||newLogo||(originalEnvironment.current!==environment.current))&&logoOK&&isValid) {
            devLog("DEBUG","setCanSave","5")
            setCanSaveDiscoveryInformation(true)
          } else {
            devLog("DEBUG","setCanSave","6")
            setCanSaveDiscoveryInformation(false)
          }  
        } else {               
          if(isValid) {                
            devLog("DEBUG","setCanSave","7")
            setCanSaveDiscoveryInformation(true)
          } else {
            devLog("DEBUG","setCanSave","8")
            setCanSaveDiscoveryInformation(false)
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
    
}, [newDiscoveryInformation, integration, setCanSaveDiscoveryInformation, setSaveDialogState, isValidSchoolSelection, setNewIntegration, newConfigurationEntityData, role, newLogo, isValidDataAttribute, isValidUserAttribute, isValidMetadata, isValidRoleDetails,newEnvironment]);

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
        {role === "idp" && (type === "wilma" || type === "opinsys") && newConfigurationEntityData && newDiscoveryInformation &&
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
        {role === "idp" && type !== "wilma" && type !== "opinsys" && newConfigurationEntityData && newDiscoveryInformation &&
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
        
        <Role integration={integration} oid={oid} environment={environment.current} name={name} setName={setName} setCanSave={setIsValidRoleDetails}/>

        {newConfigurationEntityData&&attributes&& <Grid mb={hasAttributes ? 3 : undefined}>
          <ErrorBoundary>
            <Attributes
              newConfigurationEntityData={newConfigurationEntityData}
              setNewConfigurationEntityData={setNewConfigurationEntityData}  
              attributes={attributes}
              setAttributes={setAttributes}
              attributeType="data"
              environment={environment.current}
              type={type}
              role={role}
              oid={oid}
              setCanSave={setIsValidDataAttribute}
            />
          </ErrorBoundary>
        </Grid>}
        
        {newConfigurationEntityData&&metadata&&role==='sp'&&
        <>
        <Typography variant="h2" gutterBottom>
          <FormattedMessage defaultMessage="Palvelun metadata tiedot" />
        </Typography>
        <ErrorBoundary>

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
        </ErrorBoundary>
        </>}

        {hasAttributes && attributes && newConfigurationEntityData &&(
          <>
            <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Attribuutit" />
            </Typography>
            <ErrorBoundary>
              <Attributes
                newConfigurationEntityData={newConfigurationEntityData}
                setNewConfigurationEntityData={setNewConfigurationEntityData}  
                attributes={attributes}
                setAttributes={setAttributes}
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