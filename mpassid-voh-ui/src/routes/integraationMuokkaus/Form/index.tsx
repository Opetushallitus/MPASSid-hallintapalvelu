import type { Components } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import LockResetIcon from '@mui/icons-material/LockReset';
import { devLog } from "@/utils/devLog";
import type { oneEnum } from "./MultiSelectForm";
import MultiSelectForm from "./MultiSelectForm";
import { calculateSHA1, getRandom } from '@/config';

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
    setCanSave: Dispatch<boolean>
}

export default function AttributeForm({ attribute, helperText, role, type, attributeType,  newConfigurationEntityData, uiConfiguration,onUpdate,onValidate,setCanSave }: AttributeProps) {
    const intl = useIntl();
    const id = `attribuutti.${attribute.name}`;
    const label = id in intl.messages ? { id } : undefined;           
    const tooltipId = `työkaluvihje.${attribute.name}`;
    const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
    const configuration=uiConfiguration;
    const roleConfiguration:IntegrationType=configuration.integrationType.find(i=>i.name===type) || defaultIntegrationType;
    
    devLog("DEBUG","AttributeForm (attribute)",attribute)

    const updateInputItem = (name: string,value: string,type: string) => {
        devLog("DEBUG","updateInputItem (name)",name)
        devLog("DEBUG","updateInputItem (checked)",value)
        devLog("DEBUG","updateInputItem (type)",type)
        
        devLog("DEBUG","updateInputItem (attribute)",attribute)        
        onUpdate(name,value,type)
        //currentObject.current={}
    }

    const updateSwitchItem = (name: string,value: boolean,type: string) => {
        devLog("DEBUG","updateSwitchItem (name)",name)
        devLog("DEBUG","updateSwitchItem (checked)",value)
        devLog("DEBUG","updateSwitchItem (type)",type)
        
        devLog("DEBUG","updateSwitchItem (attribute)",attribute)
        onUpdate(name,String(value),type)
        //currentObject.current={}
    }

    const updateMultiSelectItem = (value: string[]) => {
        devLog("DEBUG","updateMultiSelectItem (name)",attribute.name)
        devLog("DEBUG","updateMultiSelectItem (checked)",value)
        devLog("DEBUG","updateMultiSelectItem (type)",attribute.type)
        
        devLog("DEBUG","updateMultiSelectItem (attribute)",attribute)
        if(attribute.name !== undefined&&attribute.type) {
            onUpdate(attribute.name,value[0],attribute.type)
        }
        
        //currentObject.current={}
    }


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
    role?: any;
    type?: any;
    attribute: any;
    newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
    helperText: (data:string) => JSX.Element;
    onUpdate: (name: string,value: any) => void;
    onEdit: (name: string,value: string) => void;
    onDelete: (name: string,index: number) => void;
    onValidate: (data:string) => boolean;
    setCanSave: Dispatch<boolean>
}

export function MetadataForm({ attribute, helperText, role, type,  newConfigurationEntityData, uiConfiguration,onUpdate, onEdit,onDelete,onValidate,setCanSave,dataConfiguration }: MetadataProps) {
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
        devLog("DEBUG","MetadataForm (canSaveItem)",canSaveItem)
    }, [canSaveItem]);

    const objectOnValidate  = (data:string) => {
        devLog("DEBUG","objectOnValidate (data)",data)
        devLog("DEBUG","objectOnValidate (canSaveItem)",canSaveItem)
        return onValidate(data);
    }

    const listOnValidate  = (data:string) => {
        devLog("DEBUG","listOnValidate (data)",data)
        devLog("DEBUG","listOnValidate (canSaveItem)",canSaveItem)
        return onValidate(data);
    }
    
    const updatObjectItem  = (name: string, data:any) => {
        
        devLog("DEBUG","updatObjectItem (name)",name)
        devLog("DEBUG","updatObjectItem (data)",data)
        devLog("DEBUG","updatObjectItem (uiConfiguration)",uiConfiguration)
        //console.log("*** currentObject.current: ",currentObject.current)
        //TODO: MANDATORY CHECK for object values, if valid update ....
        //onUpdate(attribute.name,currentObject.current)
        devLog("DEBUG","updatObjectItem (mandatory)",uiConfiguration.mandatory)
        
        if(data.content) {
            if(objectOnValidate(data.content)) {
                currentObject.current[name]=data.content;    
            }
            
        } else {
            if(objectOnValidate(data)) {
                currentObject.current[name]=data;    
            }
        }
        devLog("DEBUG","updatObjectItem (result)",currentObject.current)
        
    }

    const editObject  = (name: string, data:any, index:number) => {
        
        devLog("DEBUG","editObject (name)",name)
        devLog("DEBUG","editObject (data)",data)
        devLog("DEBUG","editObject (uiConfiguration)",uiConfiguration)
        devLog("DEBUG","editObject (attribute)",attribute)
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
        
        devLog("DEBUG","deleteObjectItem (name)",name)
        devLog("DEBUG","deleteObjectItem (index)",index)
        devLog("DEBUG","deleteObjectItem (uiConfiguration)",uiConfiguration)
        devLog("DEBUG","deleteObjectItem (attribute)",attribute)
        
        onDelete(attribute.name,index);
        devLog("DEBUG","deleteObjectItem (result)",currentObject.current)
        
    }

    const updateMultiSelectItem = (configuration: UiConfiguration, value: string[]) => {
        
        devLog("DEBUG","updateMultiSelectItem ("+attribute.name+")",value)
        devLog("DEBUG","updateMultiSelectItem (type)",attribute.type)        
        devLog("DEBUG","updateMultiSelectItem (attribute)",attribute)
        devLog("DEBUG","updateMultiSelectItem (configuration)",configuration)
        
        if(configuration.multiselect !== undefined && configuration.multiselect) {
            devLog("DEBUG","updateMultiSelectItem (multiselect)",configuration.multiselect)
            onUpdate(attribute.name,value)
        } else {
            devLog("DEBUG","updateMultiSelectItem (multiselect)","false")
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

    const updateSwitchItem = (name:any,value:boolean) => {
        devLog("DEBUG","updateSwitchItem ("+name+")",value)
        
        
        devLog("DEBUG","updateSwitchItem (attribute)",attribute)
        devLog("DEBUG","updateSwitchItem (currentObject)",currentObject.current)
        
        onUpdate(name,value)
        //currentObject.current={}
    }
    const updateListObject = () => {
        
        devLog("DEBUG","updateListObject (attribute)",attribute)
        devLog("DEBUG","updateListObject (currentObject)",currentObject.current)
        
        if(objectDataRef.current.validate()) {
            onUpdate(attribute.name,currentObject.current)
            objectDataRef.current.clean()
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
        var buttonColor:"default" | "inherit" | "primary" | "secondary" | "error" | "info" | "success" | "warning"="default";
        if(configuration.mandatory&&attribute.content&&attribute.content.length===0) {
            devLog("DEBUG","MetadataForm (buttonColor)",attribute.content)
            buttonColor="error"
        } 
        var enumValues: oneEnum[] = [];
        if(configuration.enum) {
            enumValues=configuration.enum.map(e=> {return (
                                    {label: (e===null||e==='null')?intl.formatMessage({defaultMessage: "Ei arvoa" }):String(e), 
                                     value: String(e) }
                                    )})
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
                            
                            {configuration&&roleConfiguration&&configuration.object !== undefined&&
                            (<ErrorBoundary>
                            <ObjectForm key={attribute.name+"_"+configuration.name} 
                                dataConfiguration={dataConfiguration}
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
                                currentObject={currentObject}/>
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
                                    values={attribute.content}
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
                                <Grid item xs={10}></Grid>
                                <Grid item xs={2}>
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
                            {configuration&&roleConfiguration&&configuration.array&&!configuration.enum&&!configuration.object&&roleConfiguration.editable&&
                                (<Grid container spacing={2} >
                                    <Grid item xs={10}></Grid>
                                    <Grid item xs={2}>
                                        <IconButton 
                                            size="small"
                                            color={buttonColor}
                                            onClick={()=>pressButtonRef.current.pressEnter()} >
                                            <AddIcon />
                                            <FormattedMessage defaultMessage="Lisää" />
                                        </IconButton>
                                    </Grid>
                                </Grid>)
                                }
                            {configuration&&roleConfiguration&&roleConfiguration.generate&&
                                (<Grid container spacing={2} >
                                    <Grid item xs={10}></Grid>
                                    <Grid item xs={2}>
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

 export function SchoolForm({ name, value, isVisible, isEditable, isMandatory, helperText, newConfigurationEntityData,onUpdate,onValidate,setCanSave }: SchoolProps) {

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