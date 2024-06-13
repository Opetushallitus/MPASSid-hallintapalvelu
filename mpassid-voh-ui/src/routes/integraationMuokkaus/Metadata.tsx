import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import LinkValue from "./LinkValue";
import InputForm from "./Form/InputForm";
import ListForm from "./Form/ListForm";
import { useState, type Dispatch } from "react";
import { dataConfiguration } from '../../config';
import { useIntl } from 'react-intl';
import { helperText, validate } from "@/utils/Validators";
import { MetadataForm } from "./Form";


export default function Metadata({
  newConfigurationEntityData,
  setNewConfigurationEntityData,
  configurationEntity,
  role,
  type,
  setCanSave,
  oid,
  environment,
}: {
  newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
  setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>
  configurationEntity: Components.Schemas.ConfigurationEntity;
  role: string;
  type: string; 
  setCanSave: Dispatch<boolean>;
  oid: string;
  environment: number;
}) {
  
  const intl = useIntl();
  const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const mandatoryAttributes:string[] = [];
  const [metadata, setMetadata] = useState<any>(newConfigurationEntityData?.sp?.metadata||{});
  
  //console.log("*** metadata (metadata): ",metadata)

  const updateMetadata = (multivalue: boolean,name:string, value:any ) => {  
    console.log("*** updateMetadata: ",multivalue,name,value)
    if(multivalue) {
      updateMultivalueMetadata(name,value);
    } else {
      metadata[name]=value
    }
    setMetadata({...metadata})
    //console.log("*** metadata: ",metadata)
    if(newConfigurationEntityData?.sp){
      if(newConfigurationEntityData?.sp?.metadata === undefined){
        newConfigurationEntityData.sp.metadata={}
      }    
      newConfigurationEntityData.sp.metadata=metadata
    }
    
    setNewConfigurationEntityData({...newConfigurationEntityData})
    
  }

  const updateMultivalueMetadata = (name:string, value:String) => {

    if(metadata[name]) {
        const index = metadata[name].indexOf(value)
        if(index>=0) {
          metadata[name].splice(index, 1);
        } else {
          metadata[name].push(value)
        }
    } else {
      metadata[name]=[]
      metadata[name].push(value)
    }
  
  }
  
  
  if(role=="sp") {

    const providerData:Components.Schemas.ServiceProvider = configurationEntity[role]!;
  
    const logUpdateValue = (value:String) => {  
      console.log("newConfigurationEntityData: ",newConfigurationEntityData)
    }
    const emptyValidate = (value:String) => {  
      return true;
    }

    const updateScope = (name: string, value:String, type: Components.Schemas.Attribute["type"]|'metadata') => {
      console.log("value: ",value)
        console.log("newConfigurationEntityData: ",newConfigurationEntityData)

    }
    
    const validateRedirectUri = (value:string) => {
      
      var urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
	    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
	    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
	    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
	    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
	    '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
	    return !!urlPattern.test(value);

    }
    const helperTextForRedirectUri= (data:string)=><FormattedMessage defaultMessage="Uri ei ole FQDN muodossa!" />
    const emptyHelperText= (data:string)=> <></>

   
    if (role&&providerData !== undefined&&providerData.metadata && providerData.metadata !== undefined) {  
      const value = providerData.metadata.encoding && providerData.metadata.content !== undefined
        ? atob(providerData.metadata.content as unknown as string)
        : JSON.stringify(providerData.metadata, null, 2);

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
              .map((configuration) => {
                      if(configuration.mandatory) {
                        mandatoryAttributes.push(configuration.name);
                      }
                      const validator = (value:string) => {
                        return validate(configuration.validation,value);
                      }
                      const helpGeneratorText = (value:string) => {
                        return helperText(configuration.validation,value);
                      }
                      //console.log("*** metadata (configuration.name): ",configuration.name);
                      //console.log("*** metadata (content): ",metadata[configuration.name]);
                      const attribute = { type: 'metadata', 
                                          content: metadata[configuration.name],
                                          name: configuration.name}
                      
                      if(metadata[configuration.name] === undefined) {

                        if(configuration.multivalue) {
                          attribute.content=[];
                        }
                        if(!configuration.multivalue) {
                          attribute.content='';
                        }
                        if(configuration?.enum?.length===2) {
                          attribute.content=configuration.enum[0];
                        }
                          
                      }
                      //console.log("*** metadata (attribute): ",attribute);
                      const onUpdate = (name:string,value:string) => {
                        
                        if(configuration?.enum&&configuration.enum.length>0) {
                          return updateMetadata(false,name,value);
                        } else {
                          if(configuration?.multivalue) {
                            return updateMetadata(configuration.multivalue,name,value);
                          } else {
                            return updateMetadata(false,name,value);
                          }
                          
                        }
                        
                      }
                      
                      return (<MetadataForm 
                        key={configuration.name!}
                        onUpdate={onUpdate}
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
