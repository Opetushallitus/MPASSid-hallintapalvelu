import type { Components } from "@/api";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useIntl, FormattedMessage } from 'react-intl';
import InputForm from "./InputForm";
import { useRef, type Dispatch } from 'react';
import type { IntegrationType, UiConfiguration } from "../../../config";
import { defaultIntegrationType } from "../../../config"
import ListForm from "./ListForm";
import SwitchForm from "./SwitchForm";
import ObjectForm from "./ObjectForm";
import { IconButton } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';

interface AttributeProps {
    uiConfiguration: UiConfiguration;
    role?: any;
    type?: any;
    attribute: Components.Schemas.Attribute;
    attributeType: string;
    newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
    helperText: (data:string) => JSX.Element;
    onUpdate: (name: string,value: string,type: string) => void;
    onValidate: (data:string) => boolean;
    setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
    setCanSave: Dispatch<boolean>
}

export default function AttributeForm({ attribute, helperText, role, type, attributeType,  newConfigurationEntityData, setNewConfigurationEntityData, uiConfiguration,onUpdate,onValidate,setCanSave }: AttributeProps) {
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
                        {configuration&&roleConfiguration&&configuration?.enum?.length!==2&&
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
                                helperText={helperText}
                                setCanSave={setCanSave}/>)
                        }
                        {configuration&&roleConfiguration&&configuration.enum&&configuration.enum.length===2&&attributeType==='data'&&
                            (<SwitchForm key={attribute.name} 
                                object={attribute} 
                                path="content" 
                                type={attribute.name!} 
                                values={configuration.enum}
                                isEditable={roleConfiguration.editable} 
                                onUpdate={onUpdate} 
                                onValidate={onValidate} 
                                mandatory={configuration.mandatory}
                                label={label?intl.formatMessage(label):attribute.name!}
                                attributeType={"data"}
                                helperText={helperText}
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

 interface MetadataProps {
    uiConfiguration: UiConfiguration;
    role?: any;
    type?: any;
    attribute: any;
    newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
    helperText: (data:string) => JSX.Element;
    onUpdate: (name: string,value: string) => void;
    onValidate: (data:string) => boolean;
    setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
    setCanSave: Dispatch<boolean>
}

export function MetadataForm({ attribute, helperText, role, type,  newConfigurationEntityData, setNewConfigurationEntityData, uiConfiguration,onUpdate,onValidate,setCanSave }: MetadataProps) {
    const intl = useIntl();
    const id = `attribuutti.${attribute.name}`;
    const label = id in intl.messages ? { id } : undefined;           
    const tooltipId = `työkaluvihje.${attribute.name}`;
    const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
    const currentObject= useRef<any>({});

    
    const updateListObject = () => {
        console.log("*************** updateListObject: ",attribute.name,currentObject.current)
        //console.log("*** currentObject.current: ",currentObject.current)
        //TODO: MANDATORY CHECK for object values, if valid update ....
        onUpdate(attribute.name,currentObject.current)
        currentObject.current={}
    }

    const updateListItem = () => {
        console.log("*************** updateListObject: ",attribute.name,attribute.content)
        //console.log("*** currentObject.current: ",currentObject.current)
        //TODO: MANDATORY CHECK for object values, if valid update ....
        onUpdate(attribute.name,attribute.content)
        // currentObject.current={}
    }

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
                            
                            {configuration&&roleConfiguration&&configuration.object&&
                            (<ObjectForm key={attribute.name+"_"+configuration.name} 
                                object={attribute} 
                                path="content" 
                                type={attribute.name!} 
                                isEditable={roleConfiguration.editable} 
                                onUpdate={onUpdate} 
                                onValidate={onValidate} 
                                mandatory={configuration.mandatory}
                                label={label?intl.formatMessage(label):attribute.name!}
                                attributeType={"metadata"}
                                helperText={helperText}
                                setCanSave={setCanSave}
                                currentObject={currentObject}/>)
                            }
                            {configuration&&roleConfiguration&&configuration.enum&&configuration.enum.length===2&&
                                (<SwitchForm key={attribute.name} 
                                    object={attribute} 
                                    path="content" 
                                    type={attribute.name!} 
                                    values={configuration.enum}
                                    isEditable={roleConfiguration.editable} 
                                    onUpdate={onUpdate} 
                                    onValidate={onValidate} 
                                    mandatory={configuration.mandatory}
                                    label={label?intl.formatMessage(label):attribute.name!}
                                    attributeType={"metadata"}
                                    helperText={helperText}
                                    setCanSave={setCanSave}/>)
                            }
                            {configuration&&roleConfiguration&&!configuration.multivalue&&!configuration.enum&&
                                (<InputForm key={attribute.name} 
                                    object={attribute} 
                                    path="content" 
                                    type={attribute.name!} 
                                    isEditable={roleConfiguration.editable} 
                                    onUpdate={onUpdate} 
                                    onValidate={onValidate} 
                                    mandatory={configuration.mandatory}
                                    label={label?intl.formatMessage(label):attribute.name!}
                                    attributeType={"metadata"}
                                    helperText={helperText}
                                    setCanSave={setCanSave}/>)
                            }
                            {configuration&&roleConfiguration&&configuration.multivalue&&!configuration.enum&&configuration.object&&
                            (<Grid container spacing={2} >
                                <Grid item xs={10}></Grid>
                                <Grid item xs={2}>
                                    <IconButton 
                                        aria-label={intl.formatMessage({
                                        defaultMessage: "lisää",
                                        })}
                                        //disabled={listObjectValid}
                                        onClick={updateListObject} >
                                        <AddIcon />
                                    </IconButton>
                                </Grid>
                            </Grid>)
                            }
                            {configuration&&roleConfiguration&&configuration.multivalue&&!configuration.enum&&!configuration.object&&
                                (<ListForm key={attribute.name}
                                object={attribute}
                                type={attribute.name!}
                                isEditable={roleConfiguration.editable}
                                mandatory={configuration.mandatory}
                                label={label ? intl.formatMessage(label) : attribute.name!}
                                attributeType={"metadata"}
                                onValidate={onValidate}
                                helperText={helperText}
                                onUpdate={onUpdate} 
                                setCanSave={setCanSave}/>)}        
                            {configuration&&roleConfiguration&&configuration.multivalue&&!configuration.enum&&!configuration.object&&
                                (<Grid container spacing={2} >
                                    <Grid item xs={10}></Grid>
                                    <Grid item xs={2}>
                                        <IconButton 
                                            aria-label={intl.formatMessage({
                                            defaultMessage: "lisää",
                                            })}                                            
                                            onClick={updateListItem} >
                                            <AddIcon />
                                        </IconButton>
                                    </Grid>
                                </Grid>)
                                }
                        </Typography>
                    </Grid>
                    </Grid>
                
            
            </Grid>)
        } else {
            return(<></>)
        }
 }

 interface SchoolProps {
    isVisible: boolean;
    isEditable: boolean;
    isMandatory: boolean;
    name: string;
    value: string;
    newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
    helperText: (data:string) => JSX.Element;
    onUpdate: Dispatch<string>;
    onValidate: (data:string) => boolean;
    setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
    setCanSave: Dispatch<boolean>
 }

 export function SchoolForm({ name, value, isVisible, isEditable, isMandatory, helperText, newConfigurationEntityData, setNewConfigurationEntityData,onUpdate,onValidate,setCanSave }: SchoolProps) {

    const intl = useIntl();
    const id = `attribuutti.${name}`;
    const label = id in intl.messages ? { id } : undefined;           
    const tooltipId = `työkaluvihje.${name}`;
    const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
    const attribute = { type: "data" ,name: name, content: value }
    const onUpdateData = (name: string,value: string,type: string) => {
        onUpdate(value);
    }


    if(isVisible) {
        return (
            <>
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
                <Grid item xs={8}>
                    <Typography
                        sx={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                        }}
                        variant="caption"
                    >
                    {true&&
                        (<InputForm key={attribute.name} 
                            object={attribute} 
                            path="content" 
                            type={"boolean"} 
                            isEditable={isEditable} 
                            onUpdate={onUpdateData} 
                            onValidate={onValidate} 
                            mandatory={isMandatory}
                            label={label?intl.formatMessage(label):attribute.name!}
                            attributeType={"data"}
                            helperText={helperText}
                            setCanSave={setCanSave}/>)
                    }
                    </Typography>
                </Grid>
            </>)
        } else {
            return(<></>)
        }
 }