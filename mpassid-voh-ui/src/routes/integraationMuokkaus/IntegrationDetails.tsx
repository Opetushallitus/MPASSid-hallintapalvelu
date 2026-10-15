import type { Components } from "@/api";
import { useIntegrationSafe } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import { clone, cloneDeep, isEqual } from "lodash";
import {
  Alert,
  AlertTitle,
  Box,
  CircularProgress,
  Grid,
  Link as MuiLink,
  Typography
} from "@mui/material";
import type { Dispatch, MutableRefObject} from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Link, useLocation } from "react-router-dom";
import Role from "./Role";
import { DataRow } from "../integraatio/IntegrationTab/DataRow";

import Metadata from "./Metadata";
import Attributes from "./Attributes";
import IntegrationBasicDetails from "./IntegrationBasicDetails";
import type { IntegrationType, UiConfiguration } from '../../config';
import { defaultDataConfiguration, defaultIntegrationType, integrationTypesDefault } from '../../config';
import SchoolSelection from "./SchoolSelection";
import { createLogger, redactSecrets } from "@/utils/devLog";
import { computeDetailsCanSave } from "./integrationDetails/canSave";
import { withUniqueId } from "./integrationDetails/uniqueId";
import type { MetadataMap } from "./Form/types";

const debugLog = createLogger("DEBUG");


const integrationTypes = clone(integrationTypesDefault);

function removeStrings(source: Components.Schemas.Attribute[], toRemove: Components.Schemas.Attribute[]|undefined): Components.Schemas.Attribute[] {
  if(toRemove===undefined) {
    return source
  } else {
    const toRemoveSet = new Set(toRemove.map(a=>a.name));
    return source.filter(item => item.name!==undefined&&!toRemoveSet.has(item.name));
  }
  
}

interface Props {
  id: number;
  // The environment chosen in the form (index.tsx saves it from here). A ref
  // by name, so react-hooks treats writing .current as a ref update.
  deploymentPhaseRef: MutableRefObject<number>;
  metadataFile: File[];
  setSaveDialogState: Dispatch<boolean>;
  setCanSave: Dispatch<boolean>;
  newIntegration?: Components.Schemas.Integration;
  dataConfiguration: UiConfiguration[];
  setNewIntegration: Dispatch<Components.Schemas.Integration>;
  setLogo: Dispatch<Blob>;
  setMetadataFile: Dispatch<File[]>;
}



/**
 * The integration to edit comes with the navigation (location.state, the
 * view page's edit button). Without it - the edit URL opened directly, from a
 * bookmark or in a new tab - it is loaded by id. (It used to read
 * location.state unconditionally and crashed on null, so the not-found
 * message below was never shown.)
 */
export default function IntegrationDetails(props: Props) {
    const { state } = useLocation();
    const integration = state as Components.Schemas.Integration | null;
    if(integration) {
      return <IntegrationDetailsForm key={integration.id} {...props} integration={integration}/>
    }
    // id 0 is a new integration: it is created from "Luo uusi", never loaded.
    if(props.id>0) {
      return (
        <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", p: 3 }}><CircularProgress /></Box>}>
          <LoadedIntegrationDetails {...props}/>
        </Suspense>
      )
    }
    return <IntegrationNotFound id={props.id}/>
}

function LoadedIntegrationDetails(props: Props) {
    const [error, loaded] = useIntegrationSafe({ id: props.id })
    // A copy: the loaded integration is shared with the view page through
    // the cache, and the form must never change it.
    const integration = useMemo(() => loaded ? cloneDeep(loaded) : undefined, [loaded])
    if(error||!integration) {
      return <IntegrationNotFound id={props.id}/>
    }
    return <IntegrationDetailsForm key={integration.id} {...props} integration={integration}/>
}

function IntegrationNotFound({ id }: { id: number }) {
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

function IntegrationDetailsForm({ setSaveDialogState, setCanSave, setNewIntegration, newIntegration, setLogo, metadataFile, setMetadataFile,dataConfiguration,deploymentPhaseRef, integration}: Props & { integration: Components.Schemas.Integration }) {
    
    const [isValidSchoolSelection, setIsValidSchoolSelection] = useState(true);
    const [isValidDataAttribute, setIsValidDataAttribute] = useState(true);
    const [isValidUserAttribute, setIsValidUserAttribute] = useState(true);
    const [isValidMetadata, setIsValidMetadata] = useState(true);
    const [isValidRoleDetails, setIsValidRoleDetails] = useState(true);
    const [newLogo, setNewLogo] = useState(false);
    // The drafts start from the integration in their initial state. The form
    // is keyed by integration id, so another integration starts afresh.
    const [ newConfigurationEntityData, setNewConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity|undefined>(() => cloneDeep(integration.configurationEntity));
    // Nothing has changed on mount (the environment effect sets it).
    const [environmentChanged, setEnvironmentChanged] = useState(false);
    const [ newDiscoveryInformation, setNewDiscoveryInformation] = useState<Components.Schemas.DiscoveryInformation|undefined>(() => integration.discoveryInformation ? cloneDeep(integration.discoveryInformation) : undefined);
    const environment = useRef<number>((integration.deploymentPhase)?integration.deploymentPhase:-5);
    const originalEnvironment = useRef<number>(-5);
    // The integration as opened, for "has anything changed" (state from the
    // start: the validity derived during render needs it).
    const [originalIntegration] = useState<Components.Schemas.Integration>(() => cloneDeep(integration));
    const [ integrationEnvironment, setIntegrationEnvironment] = useState<number>((integration.deploymentPhase)?integration.deploymentPhase:-5);
    const [name, setName] = useState<string>(() => integration.configurationEntity?.sp?.name || '');
    const [metadataUrl, setMetadataUrl] = useState<string>(() => {
      const idp = integration.configurationEntity?.idp
      return idp&&(idp.type==='adfs'||idp.type==='azure'||idp.type==='gsuite')
        ? (idp as Components.Schemas.Adfs|Components.Schemas.Azure|Components.Schemas.Gsuite).metadataUrl || ''
        : ''
    });
    // The schema types metadata values as objects; see Form/types.ts.
    const [metadata, setMetadata] = useState<MetadataMap>(() => (integration.configurationEntity?.sp?.metadata as MetadataMap|undefined) ?? {});
    const [attributes, setAttributes] = useState<Components.Schemas.Attribute[]>(() => integration.configurationEntity?.attributes ?? []);
    const [initUserAttributes, setInitUserAttributes] = useState<string[]>([]);
    const [initDataAttributes, setInitDataAttributes] = useState<string[]>([]);
    const initAttr = useRef<string[]>([]);
    
    const role  = (integration.configurationEntity?.idp) ? "idp" : "sp"
    const type = integration.configurationEntity?.idp?.type || integration.configurationEntity?.sp?.type || "unknown"
    const oid: string = integration?.organization?.oid || "0"
    
    const uniqueIdConfiguration:UiConfiguration = dataConfiguration.filter(conf=>conf.name&&conf.name==='uniqueId')[0] || defaultDataConfiguration;
    const typeConf:IntegrationType = uniqueIdConfiguration.integrationType.filter(i=>i.name===type)[0] || defaultIntegrationType;     

    // The configurationEntity draft with the unique id attribute copied into
    // its idp/sp field (derived, the draft state is not modified). Everything
    // that reads the draft uses this.
    const draftConfigurationEntity = useMemo(
      () => newConfigurationEntityData ? withUniqueId(newConfigurationEntityData, typeConf.attribute) : undefined,
      [newConfigurationEntityData, typeConf.attribute]
    );

    // What IntegrationBasicDetails shows. For an sp the metadata's entityId /
    // client_id and the service name are merged in. Not shown for a type
    // without a unique id configuration (adfs, gsuite), as before.
    const showConfigurationEntityData = useMemo(() => {
      if(!draftConfigurationEntity||type==='unknown'||!typeConf.attribute) {
        return undefined
      }
      const sp = draftConfigurationEntity.sp
      if(!sp) {
        return draftConfigurationEntity.idp ? draftConfigurationEntity : undefined
      }
      if(type==='saml'&&metadata.entityId) {
        return { ...draftConfigurationEntity, sp: { ...sp, entityId: metadata.entityId as string | undefined, ...(name ? { name } : {}) } as Components.Schemas.SamlServiceProvider }
      }
      if(type==='oidc'&&metadata.client_id) {
        return { ...draftConfigurationEntity, sp: { ...sp, clientId: metadata.client_id as string | undefined, ...(name ? { name } : {}) } as Components.Schemas.OidcServiceProvider }
      }
      return draftConfigurationEntity
    }, [draftConfigurationEntity, type, typeConf.attribute, metadata, name]);
    
    useEffect(() => {
      debugLog("IntegrationDetails (integrationEnvironment)",integrationEnvironment)      
      environment.current=integrationEnvironment   
      deploymentPhaseRef.current=integrationEnvironment;
      if(environment.current!==originalEnvironment.current&&environment.current>=0&&originalEnvironment.current>=0) {
        setEnvironmentChanged(true) 
      } else {
        setEnvironmentChanged(false) 
      }
    }, [deploymentPhaseRef, integrationEnvironment]);

    useEffect(() => {

      if(newConfigurationEntityData!==undefined) {
                
        const unInitAttr = removeStrings(attributes.filter(a=>a.name!==undefined&&a.content!==''&&!initAttr.current.includes(a.name)),newConfigurationEntityData.attributes) 
        debugLog("IntegrationDetails (unInitAttr)",unInitAttr)
        //const unInitAttr = removeStrings(attributes,newConfigurationEntityData.attributes) 

        if(unInitAttr.length>0) {
          
          const updatedConfigurationEntityData=clone(newConfigurationEntityData); 
          if(updatedConfigurationEntityData.attributes===undefined) {
            updatedConfigurationEntityData.attributes=[];
          }               
          unInitAttr.forEach(attr=>{                    
            if(attr.name!==undefined&&attr.content!=='') {            
              updatedConfigurationEntityData.attributes?.push(attr);            
              initAttr.current.push(attr.name);
            }
          })
          debugLog("IntegrationDetails (initialized done attributes)",redactSecrets(attributes));                        
          setNewConfigurationEntityData(updatedConfigurationEntityData);
          
        }
        //debugLog("Attributes (initialized done attribute.length)",attributes?.length); 
        //debugLog("Attributes (initialized done newConfigurationEntityData?.attributes)",newConfigurationEntityData?.attributes);
      }
      
            
    }, [attributes, newConfigurationEntityData, newConfigurationEntityData?.attributes])

    // A metadata URL from Role goes into the idp draft as well. An empty URL
    // leaves the draft as it is.
    const handleMetadataUrl = (value: string) => {
      setMetadataUrl(value)
      if(value!=='') {
        setNewConfigurationEntityData(prev => {
          if(!prev?.idp||(prev.idp as Components.Schemas.Adfs).metadataUrl===value) {
            return prev
          }
          debugLog("IntegrationDetails (metadataUrl)",value)
          return { ...prev, idp: { ...prev.idp, metadataUrl: value } as Components.Schemas.IdentityProvider }
        })
      }
    }

    useEffect(() => {
      debugLog("IntegrationDetails (integration)",redactSecrets(integration))
      if(integration?.deploymentPhase!==undefined&&integration.deploymentPhase>=0) {
        if(environment.current===-5) {
          debugLog("IntegrationDetails (init environment)",integration.deploymentPhase)
          environment.current=integration.deploymentPhase
        }        
        if(originalEnvironment.current===-5) {
          debugLog("IntegrationDetails (init originalEnvironment)",integration.deploymentPhase)
          originalEnvironment.current=integration.deploymentPhase
        }
      } 
      
    }, [integration]);

    // Derived from the current values.
    const canSaveParts = computeDetailsCanSave({
      role,
      original: originalIntegration,
      configurationEntity: draftConfigurationEntity,
      discoveryInformation: newDiscoveryInformation,
      valid: {
        dataAttribute: isValidDataAttribute,
        userAttribute: isValidUserAttribute,
        metadata: isValidMetadata,
        schoolSelection: isValidSchoolSelection,
        roleDetails: isValidRoleDetails,
      },
      metadataFileCount: metadataFile.length,
      metadataUrl,
      newLogo,
      environmentChanged,
      name,
    })
    const canSaveAll = canSaveParts.configurationEntity && canSaveParts.discoveryInformation

    useEffect(() => {
      debugLog("IntegrationDetails (canSave)", canSaveParts)
      setCanSave(canSaveAll)
      // canSaveParts is logged only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setCanSave, canSaveAll]);
    
    







    // The environment as a render value. environment.current is updated in
    // effects (above), so a child reading it during render saw a switch only
    // on some later re-render. The fallback mirrors the init effect: a Testi
    // integration (deploymentPhase 0, falsy) starts integrationEnvironment at -5.
    const currentEnvironment = integrationEnvironment>=0
      ? integrationEnvironment
      : (integration?.deploymentPhase!==undefined&&integration.deploymentPhase>=0 ? integration.deploymentPhase : -5)

    // The integration to save, composed from the current drafts on every
    // change. (It used to be composed in two effects only while a draft
    // differed from the original, so reverting a change left the previous
    // composition - e.g. a reverted title - in newIntegration.) The drafts are
    // not mutated: the title default and the sp merge go into copies.
    const composedIntegration = useMemo(() => {
      const composed = cloneDeep(integration)
      if(currentEnvironment>=0) {
        composed.deploymentPhase=currentEnvironment
      }
      // name (Palvelun nimi) lives in its own state, not in the draft.
      const nameChanged = role==='sp'&&name!==(originalIntegration.configurationEntity?.sp?.name||'')
      const changed = nameChanged||
        !isEqual(draftConfigurationEntity,originalIntegration.configurationEntity)||
        !isEqual(newDiscoveryInformation,originalIntegration.discoveryInformation)
      if(!changed) {
        return composed
      }
      composed.discoveryInformation=newDiscoveryInformation
      composed.configurationEntity=draftConfigurationEntity
      const sp = draftConfigurationEntity?.sp
      const spType = integration.configurationEntity?.sp?.type
      if(role==='sp'&&sp&&spType==='saml') {
        const samlSP:Components.Schemas.SamlServiceProvider = { ...sp, entityId: metadata.entityId as string | undefined, name }
        composed.configurationEntity = { ...draftConfigurationEntity, sp: samlSP }
      }
      if(role==='sp'&&sp&&spType==='oidc') {
        const oidcSP:Components.Schemas.OidcServiceProvider = { ...sp, clientId: metadata.client_id as string | undefined, name }
        composed.configurationEntity = { ...draftConfigurationEntity, sp: oidcSP }
      }
      if(newDiscoveryInformation?.showSchools&&(newDiscoveryInformation.title===''||newDiscoveryInformation.title===undefined)&&integration.organization?.name) {
        composed.discoveryInformation = { ...newDiscoveryInformation, title: integration.organization.name }
      }
      return composed
    }, [integration, originalIntegration, currentEnvironment, role, name, metadata, draftConfigurationEntity, newDiscoveryInformation])

    // Publishes the composition, and shows the save bar while there is a
    // draft. Dependencies as the former composing effects had: they re-assert
    // the save bar at the same moments (the parent hides it for its dialogs).
    useEffect(() => {
      setSaveDialogState(newDiscoveryInformation!==undefined||(role!=='idp'&&newConfigurationEntityData!==undefined))
      if(!isEqual(composedIntegration,newIntegration)) {
        setNewIntegration(composedIntegration)
      }
    }, [composedIntegration, newIntegration, setNewIntegration, setSaveDialogState, newConfigurationEntityData, newDiscoveryInformation, role, environmentChanged, isValidDataAttribute, isValidUserAttribute, isValidMetadata, isValidSchoolSelection, isValidRoleDetails, newLogo, metadataFile, metadata, metadataUrl, name]);

    const hasAttributes =
                role === "idp" &&
                !["opinsys", "wilma"].includes(
                  integration.configurationEntity?.[role]?.type ?? ""
                );
    const hasVisibleAttributes =
                role === "idp" &&
                !["opinsys", "wilma","gsuite","adfs"].includes(
                  integration.configurationEntity?.[role]?.type ?? ""
                );

    const addInitAttributes = (initAttr:Components.Schemas.Attribute) => {
      if(initAttr.type==='user') {
        if(initAttr.name&&initAttr.name!=='') {
          initUserAttributes.push(initAttr.name)
          setInitUserAttributes(initUserAttributes)
        }        
        
      } else {
        if(initAttr.name&&initAttr.name!=='') {
          initDataAttributes.push(initAttr.name)
          setInitDataAttributes(initDataAttributes)
        }
      }      
    }
    return(<>
      
        <Typography component={"div"} variant="h2" gutterBottom >
          <FormattedMessage defaultMessage="Organisaation tiedot" />
        </Typography>
        <Grid container size={12} spacing={2} sx={{ mb: 3 }}>
          <DataRow object={integration} path="organization.name" />
          <DataRow object={integration} path="organization.oid" />
          <DataRow object={integration} path="organization.ytunnus" />
        </Grid>        

        {(role === "idp" || role === "sp" ) && integration && showConfigurationEntityData &&(
          <IntegrationBasicDetails integration={integration} configurationEntity={showConfigurationEntityData} environment={environment} metadata={metadata}/>
        )}    
        
        {newIntegration&&
        <Role integration={newIntegration} oid={oid} environment={currentEnvironment} setEnvironment={setIntegrationEnvironment} setMetadataUrl={handleMetadataUrl} metadataUrl={metadataUrl} name={name} setName={setName} setCanSave={setIsValidRoleDetails} attributes={attributes} setMetadataFile={setMetadataFile} metadataFile={metadataFile}/>}

        {newConfigurationEntityData&&attributes&& <Grid sx={{ mb: hasAttributes ? 3 : undefined }}>
          <ErrorBoundary>
            <Attributes
            key={"data"}
            dataConfiguration={dataConfiguration}
              newConfigurationEntityData={draftConfigurationEntity!}
              setNewConfigurationEntityData={setNewConfigurationEntityData}  
              attributes={attributes}
              setAttributes={setAttributes}
              initAttributes={initDataAttributes}
              addInitAttributes={addInitAttributes}              
              attributeType="data"
              environment={currentEnvironment}
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
          dataConfiguration={dataConfiguration}
          newConfigurationEntityData={draftConfigurationEntity!}
          setNewConfigurationEntityData={setNewConfigurationEntityData}
          configurationEntity={integration.configurationEntity!}
          role={role}
          type={type}
          setCanSave={setIsValidMetadata}
          oid={oid}
          environment={currentEnvironment}
          metadata={metadata}
          setMetadata={setMetadata}
        />
        </ErrorBoundary>
        </>}

        {hasVisibleAttributes && attributes && newConfigurationEntityData &&(
          
            <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Attribuutit" />
            </Typography>)}
        
        {hasAttributes && attributes && newConfigurationEntityData &&(
            <ErrorBoundary>
              <Attributes
              key={"user"}
                dataConfiguration={dataConfiguration}
                newConfigurationEntityData={draftConfigurationEntity!}
                setNewConfigurationEntityData={setNewConfigurationEntityData}  
                attributes={attributes}
                setAttributes={setAttributes}
                initAttributes={initUserAttributes}
                addInitAttributes={addInitAttributes}              
                role={role}
                attributeType="user"
                environment={currentEnvironment}
                type={type}
                oid={oid}
                setCanSave={setIsValidUserAttribute}
              />
            </ErrorBoundary>
              
          
        )}

        {role === "idp" && integrationTypes.typesOKJ.includes(type) && newConfigurationEntityData && newDiscoveryInformation &&
            (<ErrorBoundary>
                <SchoolSelection 
                    key={integration.id}
                    integration={integration} 
                    setConfigurationEntity={setNewConfigurationEntityData} 
                    configurationEntity={draftConfigurationEntity!} 
                    discoveryInformation={newDiscoveryInformation} 
                    setDiscoveryInformation={setNewDiscoveryInformation} 
                    setCanSave={setIsValidSchoolSelection}
                    setLogo={setLogo}
                    newLogo={newLogo}
                    setNewLogo={setNewLogo}
                    environment={currentEnvironment}/>
                </ErrorBoundary>
              )
        }
        
      </>)      
}
