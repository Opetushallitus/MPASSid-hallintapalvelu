import type { Components } from "@/api";
import { attributePreferredOrder } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from 'react-intl';
import type { Dispatch} from "react";
import AttributeForm from "./Form";
import { dataConfiguration } from '../../config';
import { helperText, validate } from "@/utils/Validators";
import { devLog } from "@/utils/devLog";
import { clone } from "lodash";

interface Props {
  role?: any;
  oid: string;
  environment: number;
  attributes: Components.Schemas.Attribute[];
  attributeType: Components.Schemas.Attribute["type"];
  type: any;
  newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
  setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
  setCanSave: Dispatch<boolean>;
}

export default function Attributes({ attributes, role, type, attributeType, newConfigurationEntityData, setNewConfigurationEntityData,oid,environment, setCanSave }: Props) {
  const intl = useIntl();
  const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const mandatoryAttributes:string[] = [];

  const updateAttribute = (name:string, value:string, type:string ) => {  
     
    if(attributes.map(a=>a.name).indexOf(name)>-1) {
      attributes.forEach(attribute=>{
        if(attribute.name===name) {
          attribute.content=value;
        }
      })
    } else {
      if(type==='data'||type==='user') {
        attributes.push({type: type, name: name,content: value }) 
      }
    }
    
    
    
    if(newConfigurationEntityData?.attributes&&setNewConfigurationEntityData) {
      newConfigurationEntityData.attributes=attributes;
      setNewConfigurationEntityData({ ...newConfigurationEntityData })
    }
    
    if(mandatoryAttributes.filter(ma=>attributes.filter(a=>a.content!=='').map(a=>a.name).indexOf(ma)<0).length===0) {
      setCanSave(true)
    } else {
      setCanSave(false)
    }
  }
  
    return (
      <Grid container >
        {dataConfiguration
          .filter((configuration) => configuration.type === attributeType)
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
                (attributePreferredOrder.indexOf(b.name!) -
                  attributePreferredOrder.indexOf(a.name!)) -
              (b.label ?? b.name!).localeCompare(a.label ?? a.name!)
          )
          .filter((configuration) => configuration.integrationType.filter(it=>it.name===type&&it.visible).length>0)
          .map((configuration) => {
                  if(configuration.mandatory) {
                    mandatoryAttributes.push(configuration.name);
                    if(attributes.filter(a => a.name === configuration.name).length===0||attributes.filter(a => a.name === configuration.name)[0].content=== undefined||attributes.filter(a => a.name === configuration.name)[0].content===''){
                        devLog("attributes",attributes)
                        devLog("configuration",configuration)                        
                        setCanSave(false)
                      
                      
                    }
                  }
                  const validator = (value:string) => {
                    return validate(configuration.validation,value);
                  }
                  const helpGeneratorText = (value:string) => {
                    return helperText(configuration.validation,value);
                  }
                  var useAttribute:Components.Schemas.Attribute
                  if(attributes.find(a => a.name&&a.name === configuration.name)) {
                    useAttribute=attributes.find(a => a.name&&a.name === configuration.name)||{ type: attributeType, content: '', name: 'configurationError' }
                  } else {
                    const testCOnfigurationEntity:any = clone(newConfigurationEntityData) 
                    if(configuration?.name&&testCOnfigurationEntity?.idp?.[configuration.name]) {
                      useAttribute={ type: attributeType, content: testCOnfigurationEntity.idp[configuration.name], name: configuration.name }
                    } else {
                      if(configuration.name) {
                        useAttribute={ type: attributeType, content: '', name: configuration.name }
                      } else {
                        useAttribute={ type: attributeType, content: '', name: 'configurationError' }
                      }
                      
                    }
                  }
                  
                  return (<AttributeForm 
                    key={configuration.name!}
                    onUpdate={updateAttribute}
                    onValidate={validator}
                    newConfigurationEntityData={newConfigurationEntityData}
                    setNewConfigurationEntityData={setNewConfigurationEntityData}
                    uiConfiguration={configuration}
                    attribute={useAttribute}
                    attributeType={attributeType!}
                    type={type}
                    role={role}
                    helperText={helpGeneratorText} 
                    setCanSave={function (value: boolean): void {} }                    
                    />)
                }
            
              )
          }
      </Grid>
    );
  
}
