import type { Components } from "@/api";
import { attributePreferredOrder } from "@/config";
import { Box, Grid, Tooltip, Typography } from "@mui/material";
import { useIntl, FormattedMessage } from 'react-intl';
import { DataRow } from "../integraatio/IntegrationTab/DataRow";
import InputForm from "./Form/InputForm";
import { Dispatch } from "react";
import IntegraatioForm from "./Form";
import { dataConfiguration, UiConfiguration } from '../../config';


interface Props {
  uiConfiguration?: any;
  role?: any;
  attributes: Components.Schemas.Attribute[];
  attributeType: Components.Schemas.Attribute["type"];
  type: any;
  newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
  setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>
}

export default function Attributes({ attributes, role, type, attributeType, newConfigurationEntityData, setNewConfigurationEntityData, uiConfiguration }: Props) {
  const intl = useIntl();
  const emptyAttribute:Components.Schemas.Attribute={ 
    name: "empty"

  }
  
  const logUpdateValue = (value:String) => {  
    console.log("attributes: ",attributes)
  }

  const logValidateValue = (value:String) => {  
    console.log("attributes: ",attributes)
    return true;
  }

  const updateAttribute = (value:string,attributeType:string) => {  
    console.log("value: ",value)
    console.log("attributeType: ",attributeType)
    
    attributes.forEach(attribute=>{
      if(attribute.name===attributeType) {
        attribute.content=value;
      }
    })
  
    if(newConfigurationEntityData?.attributes&&setNewConfigurationEntityData) {
      console.log("newConfigurationEntityData: ",newConfigurationEntityData)
      newConfigurationEntityData.attributes=attributes;
      setNewConfigurationEntityData({ ...newConfigurationEntityData })
    }
    
    console.log("attributes: ",attributes)
  }
  
  if(attributeType==="data") {
    return (
    <Grid container spacing={2}>
      {attributes
        .filter((attribute) => attribute.type === attributeType)
        .map((attribute) => {
          const id = `attribuutti.${attribute.name}`;
          const label = id in intl.messages ? { id } : undefined;

          return {
            ...attribute,
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
        .map(({ name, content }) => (
          <DataRow key={name} object={{ [name!]: content }} path={name!} />
        ))}
    </Grid>)
  } 

  if(attributeType==="user") {
    return (
      <Grid container >
        {dataConfiguration
          .filter((configuration) => configuration.type === attributeType)
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
              attribute={attributes.find(a=>a.name===configuration.name)||{ type: attributeType, content: '',name: configuration.name}}
              attributeType="user"
              type={type}
              role={role} />
              )
          )}
      </Grid>
    );
  }
  
  return(<></>)
}
