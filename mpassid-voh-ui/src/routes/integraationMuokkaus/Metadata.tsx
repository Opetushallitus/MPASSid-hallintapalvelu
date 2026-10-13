import type { Components } from "@/api";
import {  Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import LinkValue from "./LinkValue";
import { useEffect, useRef, type Dispatch } from "react";
import type { IntegrationType, UiConfiguration} from '../../config';
import { defaultIntegrationType, dataConfiguration } from '../../config';
import { useIntl } from 'react-intl';
import { helperText, trimCertificate, validate } from "@/utils/Validators";
import { MetadataForm } from "./Form";
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
  metadata: any;
  setMetadata: Dispatch<boolean>;
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
  const pendingEffects = useRef<Array<() => void>>([]);
  pendingEffects.current = [];

  const createAttributeContent = (name:string,currentData: any,roleConfiguration:IntegrationType,array:boolean,multiselect: boolean|undefined) => {
    debugLog("createAttributeContent (name)",name)

    if(currentData&&currentData!== undefined) {
      debugLog("createAttributeContent (currentData)",currentData)
      return currentData
    }

    if(newConfigurationEntityData&&newConfigurationEntityData?.sp&&newConfigurationEntityData.sp?.metadata&&newConfigurationEntityData.sp?.metadata[name]!== undefined) {
      debugLog("createAttributeContent (newConfigurationEntityData)",redactSecretValue(name,newConfigurationEntityData.sp?.metadata[name]))
      return newConfigurationEntityData.sp?.metadata[name]
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

  const validateMetadata = () => {
    var result=true;
    mandatoryAttributes.forEach(ma=>{
      

      debugLog("validateMetadata (mandatoryAttribute "+ma+")",redactSecretValue(ma,metadata[ma]))
      if(metadata[ma] === undefined) {
        result = false
      }
      if(metadata[ma] !== undefined&&metadata[ma].length===0) {
        result = false
      }
      
    })
    return result
  }
  const updateMetadata = (array: boolean,name:string, value:any) => {  
    debugLog("updateMetadata (mandatoryAttributes)",mandatoryAttributes)
    debugLog("updateMetadata ("+name+" array)",array)
    debugLog("updateMetadata ("+name+")",value)
    
    var newMetadata
    if(value===null) {
        newMetadata=cloneDeep(metadata)
        delete newMetadata[name]
        setMetadata(newMetadata)
    } else {
      
      if(array) {
        newMetadata=updateMultivalueMetadata(name,value);
      } else {
        newMetadata=cloneDeep(metadata)
        newMetadata[name]=value
        setMetadata(newMetadata)
      }
    }
    
    
    
    if(newConfigurationEntityData?.sp){
      if(newConfigurationEntityData?.sp?.metadata === undefined){
        newConfigurationEntityData.sp.metadata={}
      }    
      newConfigurationEntityData.sp.metadata=newMetadata
    }
    const metadataIsValid = validateMetadata()
    debugLog("updateMetadata (validateMetadata)", metadataIsValid)
    if(logEnabled("DEBUG")) {
      debugLog("updateMetadata (isEqual)", isEqual(newConfigurationEntityData,configurationEntity))
    }
    if(metadataIsValid) {
      setCanSave(true)
    } else {
      setCanSave(false)
    }
    setNewConfigurationEntityData(clone(newConfigurationEntityData))
    
  }

  const updateMultivalueMetadata = (name:string, value:String) => {

    debugLog("updateMultivalueMetadata (mandatoryAttributes)",mandatoryAttributes)
    debugLog("updateMultivalueMetadata (metadata[name])",redactSecretValue(name,metadata[name]))
    if(metadata[name]) {
        const index = metadata[name].indexOf(value)
        if(index>=0) {
          metadata[name].splice(index, 1);
        } else {
          metadata[name].push(value)
        }
    } else {
      metadata[name]=[ value ]
      
      debugLog("updateMultivalueMetadata (new metadata[name])",redactSecretValue(name,metadata[name]))
    }
    setMetadata({...metadata} )
    debugLog("updateMultivalueMetadata (metadata)",redactSecrets(metadata))
    return metadata
    
    
  }

  const saveCheck = (value:boolean) => {

      
    if(configurationEntity?.sp) {
      
      if(value) {
        setCanSave(true)  
      } else {
        setCanSave(false)
      }

    } else {
      setCanSave(false)
    }

  }
  
  
  useEffect(() => {
    const effects = pendingEffects.current;
    effects.forEach((run) => run());
  });

  // Queue a render-time metadata write instead of performing it during render.
  const queueUpdateMetadata = (array: boolean, name: string, value: any) =>
    pendingEffects.current.push(() => updateMetadata(array, name, value));

  if(role=="sp") {

    const providerData:Components.Schemas.ServiceProvider = configurationEntity[role]!;
   
    if (role&&providerData !== undefined&&providerData.metadata && providerData.metadata !== undefined) {  
      const value = providerData.metadata.encoding && providerData.metadata.content !== undefined
        ? atob(providerData.metadata.content as unknown as string)
        : JSON.stringify(providerData.metadata.content, null, 2);

        if(type==="saml"||type==="oidc") {
          return (<Grid container >
            {configurations
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
                      var attribute = { type: 'metadata', 
                                          content: createAttributeContent(configuration.name,metadata[configuration.name],roleConfiguration,configuration.array,configuration.multiselect),                                          
                                          name: configuration.name,
                                          role: role}
                                          
                      debugLog("Metadata (attribute init)",redactSecrets(attribute))
                      if(attribute.content === undefined) {
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
                            if(attribute.content.length>0) {
                              queueUpdateMetadata(configuration.array,configuration.name,attribute.content)
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
                      const onUpdate = (name:string,value:string) => {
                        debugLog("MetadataForm onUpdate (name)",name)
                        debugLog("MetadataForm onUpdate (value)",value)
                        var trimmeValue=value
                        if(configuration.trim&&configuration.trim==='cert') {
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

                      const onDelete = (name:string,index:number) => {
                        debugLog("MetadataForm onDelete (metadata)",redactSecrets(metadata))
                        debugLog("MetadataForm onDelete (name)",name)
                        debugLog("MetadataForm onDelete (index)",index)
                        const newMetadata=clone(metadata)
                        if(metadata[attribute.name]&&metadata[attribute.name].length>=index) {
                          metadata[attribute.name].splice(index, 1);
                        }
                        setMetadata(newMetadata)
                        if(validateMetadata()) {
                          setCanSave(true)
                        } else {
                          setCanSave(false)
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

                      pendingEffects.current.push(() => setCanSave(validateMetadata()))

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
              }
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
