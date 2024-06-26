import type { Components } from "@/api";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useIntl, FormattedMessage } from 'react-intl';
import InputForm from "./InputForm";
import { Dispatch } from 'react';
import { IntegrationType, dataConfiguration, defaultDataConfiguration, defaultIntegrationType, UiConfiguration } from "../../../config"

interface Props {
    uiConfiguration: UiConfiguration;
    role?: any;
    type?: any;
    attribute: Components.Schemas.Attribute;
    attributeType: Components.Schemas.Attribute["type"];
    newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
    onUpdate: (name: string,value: string,type: Components.Schemas.Attribute["type"]) => void;
    onValidate: (data: any) => boolean;
    setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
    setCanSave: Dispatch<boolean>
}

export default function IntegraatioForm({ attribute, role, type, attributeType,  newConfigurationEntityData, setNewConfigurationEntityData, uiConfiguration,onUpdate,onValidate,setCanSave }: Props) {
    const intl = useIntl();
    const id = `attribuutti.${attribute.name}`;
    const label = id in intl.messages ? { id } : undefined;           
    const tooltipId = `työkaluvihje.${attribute.name}`;
    const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
    /*const configuration=dataConfiguration.find((c:UiConfiguration) => c.oid===oid && c.type===attribute.type&&c.name===attribute.name) ||
                        dataConfiguration.find((c:UiConfiguration) => !c.oid && c.type===attribute.type&&c.name===attribute.name) || 
                        defaultDataConfiguration;
                        */
    const configuration=uiConfiguration;
    const roleConfiguration:IntegrationType=configuration.integrationType.find(i=>i.name===type) || defaultIntegrationType;
    
    if(roleConfiguration.visible) {
        return (
            <Grid container >
                
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
                        {configuration&&roleConfiguration&&
                            (<InputForm key={attribute.name} 
                                object={attribute} 
                                path="content" 
                                type={attribute.name!} 
                                isEditable={roleConfiguration.editable} 
                                onUpdate={onUpdate} 
                                onValidate={onValidate} 
                                mandatory={configuration.mandatory}
                                label={label?intl.formatMessage(label):attribute.name!}
                                attributeType={attributeType}
                                setCanSave={setCanSave}/>)
                        }
                        
                        
                        </Typography>
                    </Grid>
                    </Grid>
                
            
            </Grid>)
        } else {
            return(<></>)
        }
 }