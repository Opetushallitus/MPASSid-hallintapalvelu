import type { Components } from "@/api";
import {  Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import LinkValue from "./LinkValue";
import { type Dispatch } from "react";
import type { IntegrationType} from '../../config';
import { dataConfiguration, defaultIntegrationType } from '../../config';
import { useIntl } from 'react-intl';
import { helperText, trimCertificate, validate } from "@/utils/Validators";
import { MetadataForm } from "./Form";
import { clone, cloneDeep, isEqual } from "lodash";
import { devLog } from "@/utils/devLog";


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
  setMetadata
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
}) {
  
  const intl = useIntl();
  const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const mandatoryAttributes:string[] = [];
  
  const createAttributeContent = (name:string,currentData: any,roleConfiguration:IntegrationType,array:boolean,multiselect: boolean|undefined) => {
    devLog("createAttributeContent (name)",name)

    if(currentData&&currentData!== undefined) {
      devLog("createAttributeContent (currentData)",currentData)
      return currentData
    }

    if(newConfigurationEntityData&&newConfigurationEntityData?.sp&&newConfigurationEntityData.sp?.metadata&&newConfigurationEntityData.sp?.metadata[name]!== undefined) {
      devLog("createAttributeContent (newConfigurationEntityData)",newConfigurationEntityData.sp?.metadata[name])
      return newConfigurationEntityData.sp?.metadata[name]
    }

    if(roleConfiguration?.index&&(roleConfiguration.index==='randomsha1'||roleConfiguration.index==='name_randomsha1')) {
       return                  
    } 

    if(roleConfiguration?.defaultValue !== undefined) {
      devLog("createAttributeContent (defaultValue)",roleConfiguration.defaultValue)
      if(multiselect!==undefined&&multiselect===true) {
        return [ roleConfiguration.defaultValue ]
      } else {
        return roleConfiguration.defaultValue
      }
      
    }
    devLog("createAttributeContent (empty)",'')
    if(array) {
      return []
    } else {
      return ''
    }
    
  }

  const validateMetadata = () => {
    var result=true;
    mandatoryAttributes.forEach(ma=>{
      

      devLog("validateMetadata (mandatoryAttribute "+ma+")",metadata[ma])
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
    devLog("updateArrayMetadata (mandatoryAttributes)",mandatoryAttributes)
    devLog("updateMetadata (array)",array)
    devLog("updateMetadata ("+name+")",value)
    
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
    devLog("updateMetadata (validateMetadata)", validateMetadata())
    devLog("updateMetadata (isEqual)", isEqual(newConfigurationEntityData,configurationEntity))
    if(validateMetadata()) {
      setCanSave(true)
    } else {
      setCanSave(false)
    }
    setNewConfigurationEntityData(clone(newConfigurationEntityData))
    
  }

  const updateMultivalueMetadata = (name:string, value:String) => {

    devLog("updateMultivalueMetadata (mandatoryAttributes)",mandatoryAttributes)
    devLog("updateMultivalueMetadata (metadata[name])",metadata[name])
    if(metadata[name]) {
        const index = metadata[name].indexOf(value)
        if(index>=0) {
          metadata[name].splice(index, 1);
        } else {
          metadata[name].push(value)
        }
    } else {
      metadata[name]=[ value ]
      
      devLog("updateMultivalueMetadata (new metadata[name])",metadata[name])
    }
    setMetadata({...metadata} )
    devLog("updateMultivalueMetadata (metadata)",metadata)
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
  
  
  if(role=="sp") {

    const providerData:Components.Schemas.ServiceProvider = configurationEntity[role]!;
   
    if (role&&providerData !== undefined&&providerData.metadata && providerData.metadata !== undefined) {  
      const value = providerData.metadata.encoding && providerData.metadata.content !== undefined
        ? atob(providerData.metadata.content as unknown as string)
        : JSON.stringify(providerData.metadata.content, null, 2);

        if(type==="saml"||type==="oidc") {
          return (<Grid container >
            {dataConfiguration
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
                       devLog("validateMetadata (mandatoryAttributes)",validateMetadata())
                      }
                      const validator = (value:string) => {
                        devLog("validator",configuration.name)
                        devLog("validator",configuration.validation)
                        devLog("validator",value)
                        return validate(configuration.validation,value);
                      }
                      const helpGeneratorText = (value:string) => {
                        return helperText(configuration.validation,value);
                      }

                      const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===type) || defaultIntegrationType;
                      devLog("Metadata (roleConfiguration)",roleConfiguration) 
                      var attribute = { type: 'metadata', 
                                          content: createAttributeContent(configuration.name,metadata[configuration.name],roleConfiguration,configuration.array,configuration.multiselect),                                          
                                          name: configuration.name,
                                          role: role}
                                          
                      devLog("Metadata (attribute init)",attribute)
                      if(attribute.content === undefined) {
                        
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
                          updateMetadata(configuration.array,configuration.name,attribute.content)
                        }

                      }
                      /*
                      if(configuration.enum&&configuration.enum.length>0) {
                        
                        if(attribute.content==='') {
                          if(roleConfiguration.defaultValue !== undefined) {
                            attribute.content=roleConfiguration.defaultValue
                          } else {
                            attribute.content=configuration.enum[0];
                          } 
                        }                      
                        
                        if(configuration.array===false&&configuration.switch&&configuration.enum.length===2&&(metadata[configuration.name]===undefined||metadata[configuration.name]==='')) {
                          //Initialize switch value                    
                          updateMetadata(configuration.array,configuration.name,attribute.content)                          
                        }

                        if(configuration.array===true&&configuration.enum.length>0&&(metadata[configuration.name]===undefined||metadata[configuration.name]==='')) {
                          //Initialize array value                    
                          updateMetadata(configuration.array,configuration.name,attribute.content)                          
                        }
                      }
                        */
                      //Initialize metadata
                      if(metadata[configuration.name]!==attribute.content) {
                          if(configuration.array||(configuration.multiselect!==undefined&&configuration.multiselect===true)) {
                            if(attribute.content.length>0) {
                              updateMetadata(configuration.array,configuration.name,attribute.content)
                            }
                          } else {
                            if(attribute.content&&attribute.content!==''&&!configuration.enum) {
                              updateMetadata(configuration.array,configuration.name,attribute.content)
                            }
                            if(!attribute.content&&attribute.content!==''&&configuration.enum&&configuration.enum.length>0) {
                              updateMetadata(configuration.array,configuration.name,attribute.content)
                            }
                          }
                      }
                      
                      //console.log("*** metadata (attribute): ",attribute);
                      const onUpdate = (name:string,value:any) => {
                        devLog("MetadataForm onUpdate (name)",name)
                        devLog("MetadataForm onUpdate (value)",value)
                        var trimmeValue=value
                        if(configuration.trim&&configuration.trim==='cert') {
                           trimmeValue=trimCertificate(value);                          
                        } 
                        if(configuration?.enum&&configuration.enum.length>0) {
                          devLog("MetadataForm onUpdate (attribute enum)",attribute)
                          return updateMetadata(false,name,value);
                        } else {
                          if(configuration.array) {
                            devLog("MetadataForm onUpdate (attribute array)",attribute)    
                            return updateMetadata(configuration.array,name,trimmeValue);
                          } else {
                            devLog("MetadataForm onUpdate (attribute siglevalue)",attribute)
                            return updateMetadata(false,name,trimmeValue);
                          }
                          
                        }
                        
                      }

                      const onDelete = (name:string,index:number) => {
                        devLog("MetadataForm onDelete (metadata)",metadata)
                        devLog("MetadataForm onDelete (name)",name)
                        devLog("MetadataForm onDelete (index)",index)
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
                        devLog("MetadataForm onEdit (name)",name)
                        devLog("MetadataForm onEdit (value)",value)      
                        attribute= { type: 'metadata', 
                          content: metadata[configuration.name],
                          name: name,
                          role: role}                                                                
                      }

                      devLog("Metadata (attribute post)",attribute)
                      devLog("Metadata (attribute post)",metadata)
                      devLog("updateMeta (attribute post)",metadata)

                      setCanSave(validateMetadata())

                      return (<MetadataForm 
                        key={configuration.name!}
                        onUpdate={onUpdate}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onValidate={validator}
                        newConfigurationEntityData={newConfigurationEntityData}
                        setNewConfigurationEntityData={setNewConfigurationEntityData}  
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
        
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="Metatiedot" />
          </Grid>
          <Grid item xs={8} sx={{}}>
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
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="Metatiedot" />
          </Grid>
          <Grid item xs={8}>
            <LinkValue href={providerData.metadataUrl} />
          </Grid>
        </Grid>
      );
    }
  }
  

  return null;
}
