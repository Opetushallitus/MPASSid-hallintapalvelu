import type { Components } from "@/api";
import {  Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import LinkValue from "./LinkValue";
import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { IntegrationType, UiConfiguration} from '../../config';
import { defaultIntegrationType } from '../../config';
import { useIntl } from 'react-intl';
import { helperText, trimCertificate, validate } from "@/utils/Validators";
import { MetadataForm } from "./Form";
import type { MetadataEntry, MetadataFormObject, MetadataMap, MetadataUpdate, MetadataValue } from "./Form/types";
import { hasLength } from "./Form/types";
import { clone, cloneDeep, isEqual } from "lodash";
import { createLogger, logEnabled, redactSecretValue, redactSecrets } from "@/utils/devLog";

const debugLog = createLogger("DEBUG");


export default function Metadata({
  newConfigurationEntityData,
  setNewConfigurationEntityData,
  configurationEntity,
  role,
  type,
  setCanSave,
  oid,
  environment,
  metadata,
  setMetadata,
  dataConfiguration

}: {
  newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
  setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>
  configurationEntity: Components.Schemas.ConfigurationEntity;
  role: string;
  type: string; 
  setCanSave: Dispatch<boolean>;
  oid: string;
  environment: number;
  metadata: MetadataMap;
  setMetadata: Dispatch<SetStateAction<MetadataMap>>;
  dataConfiguration:UiConfiguration[];
}) {
  
  const intl = useIntl();
  const configurations:UiConfiguration[] = dataConfiguration.filter(conf=>conf.integrationType.filter(i=>i.name===type).length>0)
  const specialConfiguration:string[] = configurations.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  const environmentConfiguration:string[] = configurations.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const mandatoryAttributes:string[] = [];

  // React 19 no longer tolerates state updates fired during render. Queue the
  // metadata initialization / validation writes performed while rendering and
  // flush them once after commit (see the effect below). The writes are
  // idempotent, so the effect settles.
  // A list of this render (not a ref): the effect after its commit runs it.
  const pendingEffects: Array<() => void> = [];

  const createAttributeContent = (name:string,currentData: MetadataValue | undefined,roleConfiguration:IntegrationType,array:boolean,multiselect: boolean|undefined): MetadataValue | undefined => {
    debugLog("createAttributeContent (name)",name)

    if(currentData&&currentData!== undefined) {
      debugLog("createAttributeContent (currentData)",currentData)
      return currentData
    }

    if(newConfigurationEntityData&&newConfigurationEntityData?.sp&&newConfigurationEntityData.sp?.metadata&&newConfigurationEntityData.sp?.metadata[name]!== undefined) {
      debugLog("createAttributeContent (newConfigurationEntityData)",redactSecretValue(name,newConfigurationEntityData.sp?.metadata[name]))
      // The schema types metadata values as objects; see Form/types.ts.
      return newConfigurationEntityData.sp?.metadata[name] as MetadataValue
    }

    if(roleConfiguration?.index&&(roleConfiguration.index==='randomsha1'||roleConfiguration.index==='name_randomsha1')) {
       return                  
    } 

    if(roleConfiguration?.defaultValue !== undefined) {
      debugLog("createAttributeContent (defaultValue)",roleConfiguration.defaultValue)
      if(multiselect!==undefined&&multiselect===true) {
        return [ roleConfiguration.defaultValue ]
      } else {
        return roleConfiguration.defaultValue
      }
      
    }
    debugLog("createAttributeContent (empty)")
    if(array) {
      return []
    } else {
      return ''
    }
    
  }

  const validateMetadata = (data: MetadataMap = metadata) => {
    let result=true;
    mandatoryAttributes.forEach(ma=>{
      

      debugLog("validateMetadata (mandatoryAttribute "+ma+")",redactSecretValue(ma,data[ma]))
      if(data[ma] === undefined) {
        result = false
      }
      const value = data[ma]
      if(value !== undefined&&hasLength(value)&&value.length===0) {
        result = false
      }
      
    })
    return result
  }
  const updateMetadata = (array: boolean,name:string, value:MetadataUpdate) => {  
    debugLog("updateMetadata (mandatoryAttributes)",mandatoryAttributes)
    debugLog("updateMetadata ("+name+" array)",array)
    debugLog("updateMetadata ("+name+")",value)
    
    let newMetadata: MetadataMap
    if(value===null) {
        newMetadata=cloneDeep(metadata)
        delete newMetadata[name]
        setMetadata(newMetadata)
    } else {
      
      if(array) {
        newMetadata=updateMultivalueMetadata(name,value);
      } else {
        newMetadata=cloneDeep(metadata)
        // Not an array attribute, so never a single object entry.
        newMetadata[name]=value as MetadataValue
        setMetadata(newMetadata)
      }
    }
    
    
    
    // A new draft with a new sp (the props are not modified).
    const updatedConfigurationEntityData = clone(newConfigurationEntityData)
    if(updatedConfigurationEntityData?.sp){
      // The schema types metadata values as objects; see Form/types.ts.
      updatedConfigurationEntityData.sp = { ...updatedConfigurationEntityData.sp, metadata: newMetadata as Components.Schemas.ServiceProvider["metadata"] }
    }
    // Validate the new metadata: the state updates only on the next render.
    const metadataIsValid = validateMetadata(newMetadata)
    debugLog("updateMetadata (validateMetadata)", metadataIsValid)
    if(logEnabled("DEBUG")) {
      debugLog("updateMetadata (isEqual)", isEqual(updatedConfigurationEntityData,configurationEntity))
    }
    if(metadataIsValid) {
      setCanSave(true)
    } else {
      setCanSave(false)
    }
    setNewConfigurationEntityData(updatedConfigurationEntityData)
    
  }

  const updateMultivalueMetadata = (name:string, value:MetadataUpdate) => {

    debugLog("updateMultivalueMetadata (mandatoryAttributes)",mandatoryAttributes)
    debugLog("updateMultivalueMetadata (metadata[name])",redactSecretValue(name,metadata[name]))
    // Array attributes hold a list of strings or a list of object entries.
    // Build a new list and map: never mutate the current metadata state.
    const list = metadata[name] as Array<string | MetadataEntry> | undefined
    const newMetadata: MetadataMap = {...metadata}
    if(list) {
        const index = list.indexOf(value as string | MetadataEntry)
        if(index>=0) {
          newMetadata[name]=list.filter((_, i) => i !== index) as string[] | MetadataEntry[]
        } else {
          newMetadata[name]=[ ...list, value ] as string[] | MetadataEntry[]
        }
    } else {
      newMetadata[name]=[ value ] as string[] | MetadataEntry[]
      
      debugLog("updateMultivalueMetadata (new metadata[name])",redactSecretValue(name,newMetadata[name]))
    }
    setMetadata(newMetadata)
    debugLog("updateMultivalueMetadata (metadata)",redactSecrets(newMetadata))
    return newMetadata
    
    
  }

  
  

  // Queue a render-time metadata write instead of performing it during render.
  const queueUpdateMetadata = (array: boolean, name: string, value: MetadataUpdate) =>
    pendingEffects.push(() => updateMetadata(array, name, value));

  // The metadata fields of a saml/oidc service with metadata. Rendering them
  // queues the initialization writes, so the effect comes after it.
  const spProviderData = role=="sp" ? configurationEntity.sp : undefined;
  const metadataFields = spProviderData?.metadata && (type==="saml"||type==="oidc")
    ? configurations
              .filter((configuration) => configuration.type === 'metadata')
              //.filter((configuration) => configuration.environment===undefined||configuration.environment==environment )
              .filter((configuration) => (environmentConfiguration.includes(configuration.name)&&configuration.environment===environment)||(!environmentConfiguration.includes(configuration.name)&&configuration.environment===undefined))
              .filter((configuration) => (specialConfiguration.includes(configuration.name)&&configuration.oid===oid)||(!specialConfiguration.includes(configuration.name)&&!configuration.oid))
              .map((configuration) => {
                const id = `attribuutti.${configuration.name}`;
                const label = id in intl.messages ? { id } : undefined;
                return {
                  ...configuration,
                  label: label && intl.formatMessage(label),
                };
              })
              .filter(({ name }) => name)
              .sort(
                (a, b) =>
                  2 *
                  (b.label ?? b.name!).localeCompare(a.label ?? a.name!)
              )
              .filter((configuration) => configuration.integrationType.filter(it=>it.name===type&&it.visible).length>0)
              .map((configuration) => {
                      if(configuration.mandatory) {
                        mandatoryAttributes.push(configuration.name);
                        if(logEnabled("DEBUG")) {
                          debugLog("Metadata render (validateMetadata)",validateMetadata())
                        }
                      }
                      const validator = (value:string) => {
                        debugLog("validator",configuration.name)
                        debugLog("validator",configuration.validation)
                        debugLog("validator",value)
                        return validate(configuration.validation,value);
                      }
                      const helpGeneratorText = (value:string) => {
                        return helperText(configuration.validation,value);
                      }

                      const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===type) || defaultIntegrationType;
                      debugLog("Metadata (roleConfiguration)",roleConfiguration) 
                      const initialContent = createAttributeContent(configuration.name,metadata[configuration.name],roleConfiguration,configuration.array,configuration.multiselect)
                      // An undefined initial content is replaced below ('' / [] / first enum value).
                      let attribute: MetadataFormObject = { type: 'metadata', 
                                          content: initialContent ?? '',                                          
                                          name: configuration.name,
                                          role: role}
                                          
                      debugLog("Metadata (attribute init)",redactSecrets(attribute))
                      if(initialContent === undefined) {
                        debugLog("Metadata (attribute init content undefined)",redactSecrets(attribute))
                        if(configuration.array) {
                          attribute.content=[];
                        }
                        if(!configuration.array) {
                          attribute.content='';
                        }
                        
                        if(configuration.switch&&configuration.enum&&configuration.enum.length>0) {
                          attribute.content=configuration.enum[0];
                        }                        

                        if(configuration.switch&&configuration.array===false) {
                          queueUpdateMetadata(configuration.array,configuration.name,attribute.content)
                        }

                      }
                      
                      if(configuration.enum&&configuration.enum.length>0) {
                        
                        if(configuration.array===false&&configuration.switch&&configuration.enum.length===2&&(metadata[configuration.name]===undefined||metadata[configuration.name]==='')) {
                          //Initialize switch value                
                          debugLog("Metadata (attribute init switch content "+configuration.name+")",redactSecretValue(attribute.name,attribute.content))                              
                          if(attribute.content==='true') {
                            queueUpdateMetadata(configuration.array,configuration.name,true)                          
                          } else {
                            queueUpdateMetadata(configuration.array,configuration.name,false)                          
                          } 
                          
                        }

                        if(configuration.array===false&&!configuration.switch&&configuration.enum.length>0&&(metadata[configuration.name]===undefined||metadata[configuration.name]==='')) {
                          //Initialize select value                
                          debugLog("Metadata (attribute init select content "+configuration.name+")",redactSecretValue(attribute.name,attribute.content))                              
                          if(roleConfiguration.defaultValue !== undefined) {
                            queueUpdateMetadata(configuration.array,configuration.name,String(roleConfiguration.defaultValue))                          
                          } else {
                            if(configuration.enum[0]!=='null') {
                              queueUpdateMetadata(configuration.array,configuration.name,String(configuration.enum[0]))                          
                            }
                            
                          } 
                          
                        }

                        if(configuration.array===true&&configuration.enum.length>0&&(metadata[configuration.name]===undefined||metadata[configuration.name]==='')) {
                          //Initialize array value            
                          debugLog("Metadata (attribute init array content "+configuration.name+")",redactSecretValue(attribute.name,attribute.content))         
                          queueUpdateMetadata(configuration.array,configuration.name,attribute.content)                          
                        }
                        
                      }
                        

                      if(configuration.name==='authnRequestsSigned') {
                        debugLog("Metadata validateMeta(metadata[configuration.name])",redactSecretValue(configuration.name,metadata[configuration.name]))
                        debugLog("Metadata validateMeta(attribute.content)",redactSecretValue(attribute.name,attribute.content))
                      }
                      
                      //Initialize metadata
                      if(metadata[configuration.name]!==attribute.content) {
                          
                          if(configuration.array||(configuration.multiselect!==undefined&&configuration.multiselect===true)) {
                            if(hasLength(attribute.content)&&attribute.content.length>0) {
                              // Copy the whole list as the value (array=false), do not add it as one item.
                              queueUpdateMetadata(false,configuration.name,attribute.content)
                            }
                          } else {
                            if(attribute.content&&attribute.content!==''&&!configuration.enum) {
                              queueUpdateMetadata(configuration.array,configuration.name,attribute.content)
                            }
                            if(!attribute.content&&attribute.content!==''&&configuration.enum&&configuration.enum.length>0) {
                              queueUpdateMetadata(configuration.array,configuration.name,attribute.content)
                            }
                          }
                      }
                      
                      //console.log("*** metadata (attribute): ",attribute);
                      const onUpdate = (name:string,value:MetadataUpdate) => {
                        debugLog("MetadataForm onUpdate (name)",name)
                        debugLog("MetadataForm onUpdate (value)",value)
                        let trimmeValue=value
                        if(configuration.trim&&configuration.trim==='cert'&&typeof value==='string') {
                           trimmeValue=trimCertificate(value);                          
                        } 
                        if(configuration?.enum&&configuration.enum.length>0) {
                          debugLog("MetadataForm onUpdate (attribute enum)",redactSecrets(attribute))
                          return updateMetadata(false,name,value);
                        } else {
                          if(configuration.array) {
                            debugLog("MetadataForm onUpdate (attribute array)",redactSecrets(attribute))    
                            return updateMetadata(configuration.array,name,trimmeValue);
                          } else {
                            debugLog("MetadataForm onUpdate (attribute siglevalue)",redactSecrets(attribute))
                            return updateMetadata(false,name,trimmeValue);
                          }
                          
                        }
                        
                      }

                      const onDelete = (name:string | undefined,index:number) => {
                        debugLog("MetadataForm onDelete (metadata)",redactSecrets(metadata))
                        debugLog("MetadataForm onDelete (name)",name)
                        debugLog("MetadataForm onDelete (index)",index)
                        // The whole new list as the value (array=false), as in
                        // the initialization: updates the metadata, the draft
                        // and canSave. (It used to splice the current list and
                        // never update the draft, so a deletion alone was not
                        // saved.)
                        const list = metadata[attribute.name]
                        if(Array.isArray(list)&&index>=0&&index<list.length) {
                          updateMetadata(false,attribute.name,(list as Array<string | MetadataEntry>).filter((_, i) => i !== index) as string[] | MetadataEntry[])
                        }
                      }

                      const onEdit = (name:string,value:string) => {
                        debugLog("MetadataForm onEdit (name)",name)
                        debugLog("MetadataForm onEdit (value)",value)      
                        attribute= { type: 'metadata', 
                          content: metadata[configuration.name],
                          name: name,
                          role: role}                                                                
                      }

                      debugLog("Metadata (attribute post)",redactSecrets(attribute))
                      debugLog("Metadata (attribute post)",redactSecrets(metadata))

                      pendingEffects.push(() => setCanSave(validateMetadata()))

                      return (<MetadataForm 
                        key={configuration.name!}
                        dataConfiguration={dataConfiguration}
                        onUpdate={onUpdate}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onValidate={validator}
                        newConfigurationEntityData={newConfigurationEntityData}
                        uiConfiguration={configuration}
                        attribute={attribute}
                        type={type}
                        role={role} 
                        helperText={helpGeneratorText}                      
                        setCanSave={setCanSave}/>)
                    }
                
                  )
    : null;

  useEffect(() => {
    pendingEffects.forEach((run) => run());
  });

  if(role=="sp") {

    const providerData:Components.Schemas.ServiceProvider = configurationEntity[role]!;
   
    if (role&&providerData !== undefined&&providerData.metadata && providerData.metadata !== undefined) {  
      const value = providerData.metadata.encoding && providerData.metadata.content !== undefined
        ? atob(providerData.metadata.content as unknown as string)
        : JSON.stringify(providerData.metadata.content, null, 2);

        if(type==="saml"||type==="oidc") {
          return (<Grid container >
            {metadataFields}
          </Grid>)
        }  
      
      return (<>
        
        <Grid container size={12} spacing={2} sx={{ mb: 3 }}>
          <Grid size={4}>
            <FormattedMessage defaultMessage="Metatiedot" />
          </Grid>
          <Grid size={8} sx={{}}>
            <Typography
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              variant="caption"
            >
              <code>{value}</code>
            </Typography>
          </Grid>
        </Grid></>
      );
    }
  }
  if(role=="idp") {
    const providerData:Components.Schemas.Azure|Components.Schemas.Gsuite|Components.Schemas.Adfs = configurationEntity[role]!;
    if ((providerData.type==="azure"||providerData.type==="gsuite"||providerData.type==="adfs")&&providerData.metadataUrl) {
      return (
        <Grid container size={12} spacing={2} sx={{ mb: 3 }}>
          <Grid size={4}>
            <FormattedMessage defaultMessage="Metatiedot" />
          </Grid>
          <Grid size={8}>
            <LinkValue href={providerData.metadataUrl} />
          </Grid>
        </Grid>
      );
    }
  }
  

  return null;
}
