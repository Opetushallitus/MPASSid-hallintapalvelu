import type { Components } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useIntl, FormattedMessage } from 'react-intl';
import InputForm from "./InputForm";
import { useEffect, useRef, useState, type Dispatch, type JSX } from 'react';
import type { IntegrationType, UiConfiguration } from "../../../config";
import { defaultIntegrationType } from "../../../config"
import ListForm from "./ListForm";
import SwitchForm from "./SwitchForm";
import ObjectForm from "./ObjectForm";
import { IconButton } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import LockResetIcon from '@mui/icons-material/LockReset';
import { createLogger, redactSecretValue, redactSecrets } from "@/utils/devLog";
import type { oneEnum } from "./MultiSelectForm";
import MultiSelectForm from "./MultiSelectForm";
import { calculateSHA1, getRandom } from '@/config';
import type { FormObject, ListFormHandle, MetadataEntry, MetadataFormObject, MetadataUpdate, ObjectFormHandle } from "./types";
import { hasLength } from "./types";

const debugLog = createLogger("DEBUG");

interface AttributeProps {
    uiConfiguration: UiConfiguration;
    role?: string;
    type?: string;
    attribute: Components.Schemas.Attribute;
    attributeType: string;
    newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
    helperText: (data:string) => JSX.Element;
    onUpdate: (name: string,value: string,type: string) => void;
    onValidate: (data:string) => boolean;
    setCanSave: Dispatch<boolean>
}

export default function AttributeForm({ attribute, helperText, type, attributeType, uiConfiguration,onUpdate,onValidate,setCanSave }: AttributeProps) {
    const intl = useIntl();
    const id = `attribuutti.${attribute.name}`;
    const label = id in intl.messages ? { id } : undefined;           
    const tooltipId = `työkaluvihje.${attribute.name}`;
    const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
    const configuration=uiConfiguration;
    const roleConfiguration:IntegrationType=configuration.integrationType.find(i=>i.name===type) || defaultIntegrationType;
    
    debugLog("AttributeForm (attribute)",redactSecrets(attribute))

    const updateInputItem = (name: string,value: string,type: string) => {
        debugLog("updateInputItem", { name, value, type, attribute: redactSecrets(attribute) })
        onUpdate(name,value,type)
        //currentObject.current={}
    }

    const updateSwitchItem = (name: string,value: boolean,type: string) => {
        debugLog("updateSwitchItem", { name, value, type, attribute: redactSecrets(attribute) })
        onUpdate(name,String(value),type)
        //currentObject.current={}
    }

    const updateMultiSelectItem = (value: string[]) => {
        debugLog("updateMultiSelectItem", { name: attribute.name, value, type: attribute.type, attribute: redactSecrets(attribute) })
        if(attribute.name !== undefined&&attribute.type) {
            onUpdate(attribute.name,value[0],attribute.type)
        }
        
        //currentObject.current={}
    }


    if(roleConfiguration.visible) {
        let enumValues: oneEnum[] = [];
        if(configuration.enum) {
            enumValues=configuration.enum.map(e=> {return ({label: String(e), value: String(e) })})
        }
        
        return (
            <Grid container size={12} >

                    <Grid key={attribute.name} container size={12} spacing={2} sx={{ mb: 3 }} >
                    <Grid size={4}>
                    <Tooltip
                        title={
                            <>
                            {tooltip && (
                                <Box sx={{ mb: 1 }}>
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
                    <Grid size={8} sx={{}}>
                        <Typography
                        sx={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                        }}
                        variant="caption"
                        >
                        {configuration&&roleConfiguration&&!configuration.enum&&
                            (<ErrorBoundary>
                                <InputForm key={attribute.name} 
                                object={attribute} 
                                path="content" 
                                type={attribute.name!} 
                                isEditable={roleConfiguration.editable} 
                                onUpdate={updateInputItem} 
                                onValidate={onValidate} 
                                mandatory={configuration.mandatory}
                                label={label?intl.formatMessage(label):attribute.name!}
                                attributeType={attributeType}
                                helperText={helperText}
                                setCanSave={setCanSave}/>
                            </ErrorBoundary>)
                        }
                        {configuration&&roleConfiguration&&configuration.switch&&configuration.enum&&configuration.enum.length===2&&attributeType==='data'&&
                            (<ErrorBoundary>
                                <SwitchForm key={attribute.name} 
                                    object={attribute} 
                                    path="content" 
                                    type={attribute.name!} 
                                    values={configuration.enum}
                                    isEditable={roleConfiguration.editable} 
                                    onUpdate={updateSwitchItem} 
                                    onValidate={onValidate} 
                                    mandatory={configuration.mandatory}
                                    label={label?intl.formatMessage(label):attribute.name!}
                                    attributeType={"data"}
                                    helperText={helperText}
                                    setCanSave={setCanSave}/>
                            </ErrorBoundary>)
                        }
                        {configuration&&roleConfiguration&&!configuration.switch&&configuration.enum&&configuration.enum.length>0&&
                                (<ErrorBoundary>
                                    <MultiSelectForm key={attribute.name}                                    
                                        values={(attribute.content)?[ attribute.content ]:[]}
                                        isEditable={roleConfiguration.editable}
                                        onUpdate={updateMultiSelectItem} 
                                        onValidate={onValidate}
                                        mandatory={configuration.mandatory}
                                        label={label ? intl.formatMessage(label) : attribute.name!}
                                        //attributeType={"metadata"}
                                        helperText={helperText}
                                        setCanSave={setCanSave} 
                                        attributeType={"data"} 
                                        enums={enumValues} 
                                        multiple={false}
                                        />
                                </ErrorBoundary>)
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
    dataConfiguration: UiConfiguration[];
    role?: string;
    type?: string;
    attribute: MetadataFormObject;
    newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
    helperText: (data:string) => JSX.Element;
    onUpdate: (name: string,value: MetadataUpdate) => void;
    onEdit: (name: string,value: string) => void;
    onDelete: (name: string | undefined,index: number) => void;
    onValidate: (data:string) => boolean;
    setCanSave: Dispatch<boolean>
}

export function MetadataForm({ attribute, helperText, type, uiConfiguration,onUpdate,onDelete,onValidate,dataConfiguration }: MetadataProps) {
    const intl = useIntl();
    const id = `attribuutti.${attribute.name}`;
    const label = id in intl.messages ? { id } : undefined;           
    const tooltipId = `työkaluvihje.${attribute.name}`;
    const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
    const currentObject= useRef<MetadataEntry>({});
    const pressButtonRef= useRef<ListFormHandle>(null);
    const objectDataRef= useRef<ObjectFormHandle>(null);
    const [ canSaveItem, setCanSaveItem ] = useState(true)
    //const [ object, setObject ] = useState<any>(attribute)

    useEffect(() => {
        debugLog("MetadataForm (canSaveItem)",canSaveItem)
    }, [canSaveItem]);

    const objectOnValidate  = (data:string) => {
        debugLog("objectOnValidate (data)",data)
        debugLog("objectOnValidate (canSaveItem)",canSaveItem)
        return onValidate(data);
    }

    const listOnValidate  = (data:string) => {
        debugLog("listOnValidate (data)",data)
        debugLog("listOnValidate (canSaveItem)",canSaveItem)
        return onValidate(data);
    }
    
    const updatObjectItem  = (name: string, data:string) => {
        
        debugLog("updatObjectItem (name)",name)
        debugLog("updatObjectItem (data)",data)
        debugLog("updatObjectItem (uiConfiguration)",uiConfiguration)
        //console.log("*** currentObject.current: ",currentObject.current)
        //TODO: MANDATORY CHECK for object values, if valid update ....
        //onUpdate(attribute.name,currentObject.current)
        debugLog("updatObjectItem (mandatory)",uiConfiguration.mandatory)
        
        // ObjectForm always reports a plain string here (its onUpdate is
        // typed (name, string)); the former `data.content` branch was dead.
        if(objectOnValidate(data)) {
            currentObject.current[name]=data;    
        }
        debugLog("updatObjectItem (result)",redactSecrets(currentObject.current))
        
    }

    const editObject  = (name: string | undefined, data:MetadataEntry, index:number) => {
        
        debugLog("editObject", { name, data, uiConfiguration, attribute: redactSecrets(attribute) })
        //console.log("*** currentObject.current: ",currentObject.current)
        //TODO: MANDATORY CHECK for object values, if valid update ....
        //onUpdate(attribute.name,currentObject.current)
        //
        //objectDataRef.current.clean()
        
        onDelete(attribute.name,index);
        objectDataRef.current?.edit(data)
        //onEdit(name,data)
        
    }

    const deleteObjectItem  = (name: string | undefined, index:number) => {
        
        debugLog("deleteObjectItem", { name, index, uiConfiguration, attribute: redactSecrets(attribute) })
        
        onDelete(attribute.name,index);
        debugLog("deleteObjectItem (result)",redactSecrets(currentObject.current))
        
    }

    const updateMultiSelectItem = (configuration: UiConfiguration, value: string[]) => {
        
        debugLog("updateMultiSelectItem", { name: attribute.name, value, type: attribute.type, attribute: redactSecrets(attribute), configuration })
        
        if(configuration.multiselect !== undefined && configuration.multiselect) {
            debugLog("updateMultiSelectItem (multiselect)",configuration.multiselect)
            onUpdate(attribute.name,value)
        } else {
            debugLog("updateMultiSelectItem (not multiselect)")
            if(value.length>0) {
                if(value[0]==='null') {
                    onUpdate(attribute.name,null)
                } else {
                    onUpdate(attribute.name,value[0])
                }
                
            } else {
                onUpdate(attribute.name,null)
            }
        }
        

    }

    const updateSwitchItem = (name:string,value:boolean) => {
        debugLog("updateSwitchItem ("+name+")",value)
        
        
        debugLog("updateSwitchItem (attribute)",redactSecrets(attribute))
        debugLog("updateSwitchItem (currentObject)",redactSecrets(currentObject.current))
        
        onUpdate(name,value)
        //currentObject.current={}
    }
    const updateListObject = () => {
        
        debugLog("updateListObject (attribute)",redactSecrets(attribute))
        debugLog("updateListObject (currentObject)",redactSecrets(currentObject.current))
        
        if(objectDataRef.current?.validate()) {
            onUpdate(attribute.name,currentObject.current)
            objectDataRef.current?.clean()
        }
        
    }

    const configuration=uiConfiguration;
    const roleConfiguration:IntegrationType=configuration.integrationType.find(i=>i.name===type) || defaultIntegrationType;
    
    if(roleConfiguration.generate&&attribute.content==='') {
        
        if(roleConfiguration.generate==='name_randomsha1'){
            calculateSHA1(String(getRandom())).then(value=>onUpdate(attribute.name, 'id_'+value))
        }
        if(roleConfiguration.generate==='randomsha1'){
            calculateSHA1(String(getRandom())).then(value=>onUpdate(attribute.name, value))
        }
    }
    
    if(roleConfiguration.visible) {
        let buttonColor:"default" | "inherit" | "primary" | "secondary" | "error" | "info" | "success" | "warning"="default";
        if(configuration.mandatory&&attribute.content&&hasLength(attribute.content)&&attribute.content.length===0) {
            debugLog("MetadataForm (buttonColor)",redactSecretValue(attribute.name,attribute.content))
            buttonColor="error"
        } 
        let enumValues: oneEnum[] = [];
        if(configuration.enum) {
            enumValues=configuration.enum.map(e=> {return (
                                    {label: (e===null||e==='null')?intl.formatMessage({defaultMessage: "Ei arvoa" }):String(e), 
                                     value: String(e) }
                                    )})
        }
        
        return (
            <Grid container size={12} >

                    <Grid key={attribute.name} container size={12} spacing={2} sx={{ mb: 3 }} >
                    <Grid size={4}>
                    <Tooltip
                        title={
                            <>
                            {tooltip && (
                                <Box sx={{ mb: 1 }}>
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
                    
                    <Grid size={8} sx={{}}>
                        <Typography
                        sx={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                        }}
                        variant="caption"
                        >
                            
                            {configuration&&roleConfiguration&&configuration.object !== undefined&&
                            (<ErrorBoundary>
                            <ObjectForm key={attribute.name+"_"+configuration.name} 
                                dataConfiguration={dataConfiguration}
                                integrationType={type ?? ''}
                                // configuration.object: a list of objects
                                object={attribute as MetadataFormObject & { content: MetadataEntry[] }} 
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
                                currentObjectRef={currentObject}/>
                                </ErrorBoundary>)
                            }
                            {configuration&&roleConfiguration&&configuration.switch&&configuration.enum&&configuration.enum.length===2&&
                                (<ErrorBoundary><SwitchForm key={attribute.name} 
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
                                    setCanSave={setCanSaveItem}/></ErrorBoundary>)
                            }
                            {configuration&&roleConfiguration&&!configuration.switch&&configuration.enum&&configuration.enum.length>0&&
                                (<ErrorBoundary><MultiSelectForm key={attribute.name}
                                    //object={attribute} 
                                    //path="content" 
                                    //type={attribute.name!} 
                                    // enum (non-switch) attributes hold the selected values
                                    values={attribute.content as string[]}
                                    isEditable={roleConfiguration.editable}
                                    //onUpdate={onUpdate} 
                                    onValidate={onValidate}
                                    mandatory={configuration.mandatory&&hasLength(attribute.content)&&attribute.content.length===0}
                                    label={label ? intl.formatMessage(label) : attribute.name!}
                                    //attributeType={"metadata"}
                                    helperText={helperText}
                                    setCanSave={setCanSaveItem} 
                                    attributeType={"data"} 
                                    enums={enumValues} 
                                    createEmpty={true}
                                    multiple={configuration.multiselect}
                                    onUpdate={value=>updateMultiSelectItem(configuration,value)}/></ErrorBoundary>)
                            }
                            {configuration&&roleConfiguration&&!configuration.array&&!configuration.enum&&
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
                            {configuration&&roleConfiguration&&configuration.array&&!configuration.enum&&configuration.object&&roleConfiguration.editable&&
                            (<Grid container spacing={2} >
                                <Grid size={10}></Grid>
                                <Grid size={2}>
                                        <IconButton 
                                            size="small"
                                            color={buttonColor}                                                                                        
                                            onClick={updateListObject} >                                                
                                            <AddIcon />     
                                            <FormattedMessage defaultMessage="Lisää" />                           
                                        </IconButton>            
                                </Grid>
                            </Grid>)
                            }
                            {configuration&&roleConfiguration&&configuration.array&&!configuration.enum&&!configuration.object&&
                                (<ListForm key={attribute.name}
                                // configuration.array without enum/object: a list of strings
                                object={attribute as FormObject<string[]> & { content: string[] }}
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
                            {configuration&&roleConfiguration&&configuration.array&&!configuration.enum&&!configuration.object&&roleConfiguration.editable&&
                                (<Grid container spacing={2} >
                                    <Grid size={10}></Grid>
                                    <Grid size={2}>
                                        <IconButton 
                                            size="small"
                                            color={buttonColor}
                                            onClick={()=>pressButtonRef.current?.pressEnter()} >
                                            <AddIcon />
                                            <FormattedMessage defaultMessage="Lisää" />
                                        </IconButton>
                                    </Grid>
                                </Grid>)
                                }
                            {configuration&&roleConfiguration&&roleConfiguration.generate&&
                                (<Grid container spacing={2} >
                                    <Grid size={10}></Grid>
                                    <Grid size={2}>
                                        <IconButton    
                                            key="generate"                                                                                   
                                            onClick={()=>{
                                                    if(roleConfiguration.generate==='name_randomsha1'){
                                                        calculateSHA1(String(getRandom())).then(value=>onUpdate(attribute.name, 'id_'+value))
                                                    }
                                                    if(roleConfiguration.generate==='randomsha1'){
                                                        calculateSHA1(String(getRandom())).then(value=>onUpdate(attribute.name, value))
                                                    }                                                
                                                }} >
                                            <LockResetIcon />
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
    setCanSave: Dispatch<boolean>
 }

 export function SchoolForm({ name, value, isVisible, isEditable, isMandatory, helperText, onUpdate,onValidate,setCanSave }: SchoolProps) {

    const intl = useIntl();
    const id = `attribuutti.${name}`;
    const label = id in intl.messages ? { id } : undefined;           
    const tooltipId = `työkaluvihje.${name}`;
    const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
    const attribute = { type: "data" ,name: name, content: value }
    const onUpdateData = (name: string,value: string,_type: string) => {
        onUpdate(value);
    }


    if(isVisible) {
        return (
            <>
                <Grid size={4}>
                    <Tooltip
                        title={
                            <>
                            {tooltip && (
                                <Box sx={{ mb: 1 }}>
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
                <Grid size={8}>
                    <Typography
                        sx={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                        }}
                        variant="caption"
                    >
                    {
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