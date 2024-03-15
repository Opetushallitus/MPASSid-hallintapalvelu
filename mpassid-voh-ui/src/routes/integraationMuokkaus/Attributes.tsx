import type { Components } from "@/api";
import { attributePreferredOrder } from "@/config";
import { Box, Grid, Tooltip, Typography } from "@mui/material";
import { useIntl, FormattedMessage } from 'react-intl';
import { DataRow } from "../integraatio/IntegrationTab/DataRow";
import InputForm from "./Form/InputForm";
import { Dispatch } from "react";


interface Props {
  attributes: Components.Schemas.Attribute[];
  type: Components.Schemas.Attribute["type"];
  newConfigurationEntityData?: Components.Schemas.ConfigurationEntity; 
  setNewConfigurationEntityData?: Dispatch<Components.Schemas.ConfigurationEntity>
}

export default function Attributes({ attributes, type, newConfigurationEntityData, setNewConfigurationEntityData }: Props) {
  const intl = useIntl();
  
  const logUpdateValue = (value:String) => {  
    console.log("attributes: ",attributes)
  }

  const updateAttribute = (value:string,type:string) => {  
    console.log("value: ",value)
    console.log("type: ",type)
    
    attributes.forEach(attribute=>{
      if(attribute.name===type) {
        attribute.content=value;
      }
    })
  
    if(newConfigurationEntityData?.attributes&&setNewConfigurationEntityData) {
      newConfigurationEntityData.attributes=attributes;
      setNewConfigurationEntityData({...newConfigurationEntityData})
    }
    
    console.log("attributes: ",attributes)
  }
  
  if(type==="data") {
    return (
    <Grid container spacing={2}>
      {attributes
        .filter((attribute) => attribute.type === type)
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

  if(type==="user") {
    return (
      <Grid container >
        {attributes
          .filter((attribute) => attribute.type === type)
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
          .map((attribute) => {
            const id = `attribuutti.${attribute.name}`;
            const label = id in intl.messages ? { id } : undefined;
            const tooltipId = `työkaluvihje.${attribute.name}`;
            const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
            return (
              <Grid key={attribute.name} container spacing={2} mb={3} >
                <Grid item xs={4}>
                <Tooltip
                    title={
                      <>
                        {tooltip && (
                          <Box mb={1}>
                            <FormattedMessage {...tooltip} />
                          </Box>
                        )}
                        <code>{attribute.name}</code>
                      </>
                    }
                    >
                    <span>{label ? <FormattedMessage {...label} /> : attribute.name}</span>
                  </Tooltip>
                  
                  
                </Grid>
                <Grid item xs={8} sx={{}}>
                  <Typography
                    sx={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                    variant="caption"
                  >
                    
                    <InputForm key={attribute.name} object={attribute} path="content" type={attribute.name!} isEditable={true} onUpdate={updateAttribute}/>
                  </Typography>
                </Grid>
              </Grid>
          )
          }
          )}
      </Grid>
    );
  }
  
  return(<></>)
}
