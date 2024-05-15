import type { Components } from "@/api";
import { attributePreferredOrder } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from 'react-intl';
import type { Dispatch} from "react";
import IntegraatioForm from "./Form";
import { dataConfiguration } from '../../config';
import { helperText, validate } from "@/utils/Validators";

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

  const updateAttribute = (name:string, value:string, type:Components.Schemas.Attribute['type'] ) => {  
     
    if(attributes.map(a=>a.name).indexOf(name)>-1) {
      attributes.forEach(attribute=>{
        if(attribute.name===name) {
          attribute.content=value;
        }
      })
    } else {
      attributes.push({type: type, name: name,content: value }) 
    }
    
    if(mandatoryAttributes.filter(ma=>!attributes.map(a=>a.name).includes(ma)).length===0) {
      setCanSave(true)
    }
    
    if(newConfigurationEntityData?.attributes&&setNewConfigurationEntityData) {
      newConfigurationEntityData.attributes=attributes;
      setNewConfigurationEntityData({ ...newConfigurationEntityData })
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
                  return (<IntegraatioForm 
                    key={configuration.name!}
                    onUpdate={updateAttribute}
                    onValidate={validator}
                    newConfigurationEntityData={newConfigurationEntityData}
                    setNewConfigurationEntityData={setNewConfigurationEntityData}  
                    uiConfiguration={configuration}
                    attribute={attributes.find(a=>a.name===configuration.name)||{ type: attributeType, content: '',name: configuration.name}}
                    attributeType={attributeType}
                    type={type}
                    role={role} 
                    helperText={helpGeneratorText}
                    setCanSave={setCanSave}/>)
                }
            
              )
          }
      </Grid>
    );
  
}
