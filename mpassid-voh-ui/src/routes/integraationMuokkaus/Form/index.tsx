import type { Components } from "@/api";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useIntl, FormattedMessage } from 'react-intl';
import InputForm from "./InputForm";
import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { IntegrationType, UiConfiguration } from "../../../config";
import { defaultIntegrationType } from "../../../config"
import ListForm from "./ListForm";
import SwitchForm from "./SwitchForm";
import ObjectForm from "./ObjectForm";
import { IconButton } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import { devLog } from "@/utils/devLog";
import type { oneEnum } from "./MultiSelectForm";
import MultiSelectForm from "./MultiSelectForm";

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
    onEdit: (name: string,value: string) => void;
    onDelete: (name: string,index: number) => void;
    onValidate: (data:string) => boolean;
    setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
    setCanSave: Dispatch<boolean>
}

export function MetadataForm({ attribute, helperText, role, type,  newConfigurationEntityData, setNewConfigurationEntityData, uiConfiguration,onUpdate, onEdit,onDelete,onValidate,setCanSave }: MetadataProps) {
    const intl = useIntl();
    const id = `attribuutti.${attribute.name}`;
    const label = id in intl.messages ? { id } : undefined;           
    const tooltipId = `työkaluvihje.${attribute.name}`;
    const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
    const currentObject= useRef<any>({});
    const pressButtonRef= useRef<any>(true);
    const objectDataRef= useRef<any>(true);
    const [ canSaveItem, setCanSaveItem ] = useState(true)
    //const [ object, setObject ] = useState<any>(attribute)

    useEffect(() => {
        devLog("MetadataForm (canSaveItem)",canSaveItem)
    }, [canSaveItem]);

    const objectOnValidate  = (data:string) => {
        devLog("objectOnValidate (data)",data)
        devLog("objectOnValidate (canSaveItem)",canSaveItem)
        return onValidate(data);
    }

    const listOnValidate  = (data:string) => {
        devLog("listOnValidate (data)",data)
        devLog("listOnValidate (canSaveItem)",canSaveItem)
        return onValidate(data);
    }
    
    const updatObjectItem  = (name: string, data:any) => {
        
        devLog("updatObjectItem (name)",name)
        devLog("updatObjectItem (data)",data)
        devLog("updatObjectItem (uiConfiguration)",uiConfiguration)
        //console.log("*** currentObject.current: ",currentObject.current)
        //TODO: MANDATORY CHECK for object values, if valid update ....
        //onUpdate(attribute.name,currentObject.current)
        devLog("updatObjectItem (mandatory)",uiConfiguration.mandatory)

        if(data.content) {
            currentObject.current[name]=data.content;
        } else {
            currentObject.current[name]=data;
        }
        devLog("updatObjectItem (result)",currentObject.current)
        
    }

    const editObject  = (name: string, data:any, index:number) => {
        
        devLog("editObject (name)",name)
        devLog("editObject (data)",data)
        devLog("editObject (uiConfiguration)",uiConfiguration)
        devLog("editObject (attribute)",attribute)
        //console.log("*** currentObject.current: ",currentObject.current)
        //TODO: MANDATORY CHECK for object values, if valid update ....
        //onUpdate(attribute.name,currentObject.current)
        //
        //objectDataRef.current.clean()
        
        onDelete(attribute.name,index);
        objectDataRef.current.edit(data)
        //onEdit(name,data)
        
    }

    const deleteObjectItem  = (name: string, index:number) => {
        
        devLog("deleteObjectItem (name)",name)
        devLog("deleteObjectItem (index)",index)
        devLog("deleteObjectItem (uiConfiguration)",uiConfiguration)
        devLog("deleteObjectItem (attribute)",attribute)
        
        onDelete(attribute.name,index);
        devLog("deleteObjectItem (result)",currentObject.current)
        
    }
    const updateSwitchItem = (name:any,value:any) => {
        devLog("updateSwitchItem (checked)",value)
        devLog("updateSwitchItem (type)",name)
        
        devLog("updateSwitchItem (attribute)",attribute)
        devLog("updateSwitchItem (currentObject)",currentObject.current)
        
        onUpdate(name,value)
        //currentObject.current={}
    }
    const updateListObject = () => {
        
        devLog("updateListObject (attribute)",attribute)
        devLog("updateListObject (currentObject)",currentObject.current)
        
        if(objectDataRef.current.validate()) {
            onUpdate(attribute.name,currentObject.current)
            objectDataRef.current.clean()
        }
        
    }

    const configuration=uiConfiguration;
    const roleConfiguration:IntegrationType=configuration.integrationType.find(i=>i.name===type) || defaultIntegrationType;
    
    if(roleConfiguration.visible) {
        var enumValues: oneEnum[] = [];
        if(configuration.enum) {
            enumValues=configuration.enum.map(e=> {return ({label: String(e), value: String(e) })})
        }
        
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
                                integrationType={type}
                                object={attribute} 
                                path="content" 
                                type={attribute.name!} 
                                isEditable={roleConfiguration.editable} 
                                onUpdate={updatObjectItem} 
                                onEdit={editObject} 
                                onDelete={deleteObjectItem} 
                                onValidate={objectOnValidate} 
                                mandatory={configuration.mandatory}
                                label={label?intl.formatMessage(label):attribute.name!}
                                attributeType={"metadata"}
                                helperText={helperText}
                                setCanSave={setCanSaveItem}
                                objectData={objectDataRef}
                                currentObject={currentObject}/>)
                            }
                            {configuration&&roleConfiguration&&configuration.enum&&configuration.enum.length===2&&
                                (<SwitchForm key={attribute.name} 
                                    object={attribute} 
                                    path="content" 
                                    type={attribute.name!} 
                                    values={configuration.enum}
                                    isEditable={roleConfiguration.editable} 
                                    onUpdate={updateSwitchItem} 
                                    onValidate={onValidate} 
                                    mandatory={configuration.mandatory}
                                    label={label?intl.formatMessage(label):attribute.name!}
                                    attributeType={"metadata"}
                                    helperText={helperText}
                                    setCanSave={setCanSaveItem}/>)
                            }
                            {configuration&&roleConfiguration&&configuration.enum&&configuration.enum.length>2&&
                                (<MultiSelectForm key={attribute.name}
                                    //object={attribute} 
                                    //path="content" 
                                    //type={attribute.name!} 
                                    values={configuration.enum}
                                    isEditable={roleConfiguration.editable}
                                    //onUpdate={onUpdate} 
                                    onValidate={onValidate}
                                    mandatory={configuration.mandatory}
                                    label={label ? intl.formatMessage(label) : attribute.name!}
                                    //attributeType={"metadata"}
                                    helperText={helperText}
                                    setCanSave={setCanSaveItem} 
                                    attributeType={"data"} 
                                    enums={enumValues} 
                                    onUpdate={function (values: string[]): void {
                                        throw new Error("Function not implemented.");
                                    } }/>)
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
                                    setCanSave={setCanSaveItem}/>)
                            }
                            {configuration&&roleConfiguration&&configuration.multivalue&&!configuration.enum&&configuration.object&&roleConfiguration.editable&&
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
                                noErrors={true}
                                type={attribute.name!}
                                isEditable={roleConfiguration.editable}
                                mandatory={configuration.mandatory}
                                label={label ? intl.formatMessage(label) : attribute.name!}
                                attributeType={"metadata"}
                                onValidate={listOnValidate}
                                helperText={helperText}
                                onUpdate={onUpdate} 
                                pressButton={pressButtonRef}
                                setCanSave={setCanSaveItem}/>)}        
                            {configuration&&roleConfiguration&&configuration.multivalue&&!configuration.enum&&!configuration.object&&roleConfiguration.editable&&
                                (<Grid container spacing={2} >
                                    <Grid item xs={10}></Grid>
                                    <Grid item xs={2}>
                                        <IconButton 
                                            aria-label={intl.formatMessage({
                                            defaultMessage: "lisää",
                                            })}                                            
                                            onClick={()=>pressButtonRef.current.pressEnter()} >
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