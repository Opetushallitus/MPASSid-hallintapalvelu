import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import LinkValue from "./LinkValue";
import InputForm from "./Form/InputForm";
import ListForm from "./Form/ListForm";
import { useState, type Dispatch } from "react";
import { dataConfiguration, defaultIntegrationType, IntegrationType, UiConfiguration } from '../../config';
import { useIntl } from 'react-intl';
import { helperText, validate } from "@/utils/Validators";
import { MetadataForm } from "./Form";
import { clone, isEqual } from "lodash";
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
  
  devLog("function Metadata (dataConfiguration)",dataConfiguration)
  devLog("function Metadata (oid)",oid)
  devLog("function Metadata (specialConfiguration)",specialConfiguration)
  devLog("function Metadata (environment)",environment)
  devLog("function Metadata (environmentConfiguration)",environmentConfiguration)
  
  //console.log("*** metadata (metadata): ",metadata)
  //console.log("*** metadata (type): ",type)

  const validateMetadata = () => {
    var result=true;
    mandatoryAttributes.forEach(ma=>{
      
      devLog("validateMetadata (mandatoryAttribute)",ma)
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
  const updateMetadata = (multivalue: boolean,name:string, value:any) => {  
    devLog("updateMultivalueMetadata (mandatoryAttributes)",mandatoryAttributes)
    devLog("updateMetadata 1",multivalue)
    devLog("updateMetadata 2",name)
    devLog("updateMetadata 3",value)
    if(multivalue) {
      updateMultivalueMetadata(name,value);
    } else {
      metadata[name]=value
      setMetadata({...metadata})
    }
    
    
    if(newConfigurationEntityData?.sp){
      if(newConfigurationEntityData?.sp?.metadata === undefined){
        newConfigurationEntityData.sp.metadata={}
      }    
      newConfigurationEntityData.sp.metadata=metadata
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
    /*
    devLog("validateMetadata (updateMultivalueMetadata)", validateMetadata())
    if(validateMetadata()) {
      setCanSave(true)
    } else {
      setCanSave(false)
    }
      */
    devLog("updateMultivalueMetadata (metadata)",metadata)
    
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
      console.log("**************** providerData.metadata",providerData.metadata)
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
                      
                      var attribute = { type: 'metadata', 
                                          content: metadata[configuration.name]||roleConfiguration?.defaultValue||'',
                                          name: configuration.name,
                                          role: role}
                      
                      if(metadata[configuration.name] === undefined) {

                        if(configuration.multivalue) {
                          attribute.content=[];
                        }
                        if(!configuration.multivalue) {
                          attribute.content='';
                        }
                        
                        if(configuration?.enum?.length===2&&attribute.content==='') {
                          attribute.content=configuration.enum[0];
                        }

                        if(configuration?.enum?.length===2&&configuration.multivalue===false) {
                          updateMetadata(configuration.multivalue,configuration.name,attribute.content)
                        }
                        

                      }
                      //console.log("*** metadata (attribute): ",attribute);
                      const onUpdate = (name:string,value:string) => {
                        devLog("MetadataForm onUpdate (name)",name)
                        devLog("MetadataForm onUpdate (value)",value)
                        if(configuration?.enum&&configuration.enum.length>0) {
                          devLog("MetadataForm onUpdate (attribute enum)",attribute)
                          return updateMetadata(false,name,value);
                        } else {
                          if(configuration.multivalue) {
                            devLog("MetadataForm onUpdate (attribute multivalue)",attribute)                            
                            return updateMetadata(configuration.multivalue,name,value);
                          } else {
                            devLog("MetadataForm onUpdate (attribute siglevalue)",attribute)
                            return updateMetadata(false,name,value);
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
