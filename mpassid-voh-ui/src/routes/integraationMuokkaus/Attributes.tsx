import type { Components } from "@/api";
import { attributePreferredOrder } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from 'react-intl';
import { DataRow } from "../integraatio/IntegrationTab/DataRow";
import { Dispatch, useEffect, useRef, useState } from "react";
import IntegraatioForm from "./Form";
import { dataConfiguration } from '../../config';


interface Props {
  role?: any;
  oid: string;
  environment: number;
  attributes: Components.Schemas.Attribute[];
  attributeType: Components.Schemas.Attribute["type"];
  type: any;
  newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
  setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>
}

export default function Attributes({ attributes, role, type, attributeType, newConfigurationEntityData, setNewConfigurationEntityData,oid,environment }: Props) {
  const intl = useIntl();
  const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  console.log("environment: ",environment)
  const logUpdateValue = (value:String) => {  
    console.log("attributes: ",attributes)
  }

  const logValidateValue = (value:String) => {  
    console.log("attributes: ",attributes)
    return true;
  }

  const updateAttribute = (name:string, value:string, type:Components.Schemas.Attribute['type'] ) => {  
    console.log("updateAttribute name: ",name)
    console.log("updateAttribute value: ",value)
    
    
    if(attributes.map(a=>a.name).indexOf(name)>-1) {
      attributes.forEach(attribute=>{
        if(attribute.name===name) {
          attribute.content=value;
        }
      })
    } else {
      attributes.push({type: type, name: name,content: value }) 
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
          .filter((configuration) => configuration.environment===undefined||configuration.environment==environment )
          .filter((configuration) => (specialConfiguration.includes(configuration.name)&&configuration.oid)||(!specialConfiguration.includes(configuration.name)&&!configuration.oid))
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
          .map((configuration) => (
            <IntegraatioForm 
              key={configuration.name!}
              onUpdate={updateAttribute}
              onValidate={logValidateValue}
              newConfigurationEntityData={newConfigurationEntityData}
              setNewConfigurationEntityData={setNewConfigurationEntityData}  
              uiConfiguration={configuration}
              attribute={attributes.find(a=>a.name===configuration.name)||{ type: attributeType, content: '',name: configuration.name}}
              attributeType={attributeType}
              type={type}
              role={role} />
              )
          )}
      </Grid>
    );
  
}
