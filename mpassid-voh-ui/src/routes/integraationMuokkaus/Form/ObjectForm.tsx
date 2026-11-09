
import { Box, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import type { Dispatch, JSX } from "react";
import { useEffect, useRef, useState, useImperativeHandle } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import type { IntegrationType, UiConfiguration } from "@/config";
import { calculateSHA1, defaultIntegrationType, getRandom } from "@/config";
import { trimCertificate, helperText as vHelperText, validate } from "@/utils/Validators";
import SwitchForm from "./SwitchForm";
import ListForm from "./ListForm";
import InputForm from "./InputForm";
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import { createLogger, redactSecretValue, redactSecrets } from "@/utils/devLog";
import type { FormObject, MetadataEntry, MetadataValue, ObjectFormHandle } from "./types";
import { hasLength } from "./types";

const debugLog = createLogger("DEBUG");

interface Props {
  object: FormObject<MetadataEntry[]> & { content: MetadataEntry[] };
  type: string;
  label: string;
  attributeType: string;
  integrationType: string;
  isEditable: boolean;
  mandatory: boolean;
  path: string;
  currentObjectRef: React.MutableRefObject<MetadataEntry>;
  dataConfiguration: UiConfiguration[];
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: string) => void;
  onEdit: (name: string | undefined,value: MetadataEntry,index: number) => void;
  onDelete: (name: string | undefined,index: number) => void;
  onValidate: (data:string) => boolean;
  objectData?: React.Ref<ObjectFormHandle>;
}

  
export default function ObjectForm({ object, isEditable=false, mandatory=false,helperText, onUpdate, onEdit, onDelete, onValidate, attributeType,setCanSave, currentObjectRef, integrationType, objectData,dataConfiguration }: Props) {
  const intl = useIntl();
  const id = `attribuutti.${object.name}`;
  //const tooltipId = `työkaluvihje.${object.name}`;
  const label = id in intl.messages ? { id } : undefined;
  //const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
  const objectConfiguration:UiConfiguration[] = dataConfiguration.filter(conf=>conf.type===object.name) || [];
  //const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  //const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  

  
  //const roleConfiguration:IntegrationType=objectConfiguration.filter(c=>c.name===object.name)[0].integrationType.find(i=>i.name===integrationType) || defaultIntegrationType;
  //const roleConfiguration:IntegrationType=defaultIntegrationType;
  
  const [reload, setReload] = useState(true);
  const [, setUsedHelperText] = useState<JSX.Element>(<></>);
  const inputValue = useRef<MetadataEntry | null>(null);
  
  // A mandatory object starts unsaveable. (inputRef was never attached, so
  // the former check of its value was always "empty"; the helper text and
  // validity it also set were never shown.)
  useEffect(() => {
    if(mandatory) {
      setCanSave(false)  
    }
  }, [ mandatory, setCanSave ]);


  const createAttributeContent = (name:string,inputValue: React.MutableRefObject<MetadataEntry | null>,currentObjectRef: React.MutableRefObject<MetadataEntry>,roleConfiguration:IntegrationType): MetadataValue => {
    debugLog("createAttributeContent (name)",name)
    if(inputValue.current&&inputValue.current[name]) {
      debugLog("createAttributeContent (inputValue)",redactSecretValue(name,inputValue.current[name]))
      return inputValue.current[name]
    }
    
    if(currentObjectRef.current&&currentObjectRef.current[name]!== undefined) {
      debugLog("createAttributeContent (currentObjectRef)",redactSecretValue(name,currentObjectRef.current[name]))
      return currentObjectRef.current[name]
    }
    if(roleConfiguration?.defaultValue) {
      debugLog("createAttributeContent (defaultValue)",roleConfiguration.defaultValue)
      return roleConfiguration.defaultValue
    }
    debugLog("createAttributeContent (empty)")
    return ''
  }

  const validateObject = () => {
    let result=true;
    
    objectConfiguration.forEach(configuration=>{
      const name=configuration.name
      debugLog("validateObject (attribute "+name+")",redactSecretValue(name,currentObjectRef.current[name]))
    
      if(configuration) {
        const value = currentObjectRef.current[name]
        if((value === undefined|| (hasLength(value) && value.length===0)) && configuration.mandatory ){
          result = false
        } else if(!validate(configuration.validation,value as string)) {
          // Switch/list values reach the validators as-is (they coerce to
          // string internally), exactly as before this was typed.
          // Any invalid field fails the whole object.
          result = false
        }
      }      
    })
    
    debugLog("validateObject (result)",redactSecrets(result))
    return result
  }

  // After validateObject: the handle calls it.
  useImperativeHandle(objectData, () => ({
    clean() {
      debugLog("ObjectForm (clean)",object)
      debugLog("ObjectForm (clean)",redactSecrets(currentObjectRef.current))

      setReload(!reload)
      currentObjectRef.current={}
      setCanSave(validateObject())
      debugLog("ObjectForm (clean)",redactSecrets(currentObjectRef.current))
      
    },
    validate() {
      debugLog("ObjectForm (validateObject)",redactSecrets(currentObjectRef.current))
      return validateObject()
    },
    edit(editObject?:MetadataEntry) {
      debugLog("ObjectForm (editObject)",editObject)
      // Copy: rendering consumes (deletes) the fields, the caller's object must stay intact.
      inputValue.current=editObject ? { ...editObject } : null
      //setReload(!reload)
    }
    
  }));
  
  const updateObjectInputFormValue = (name: string,value: string,type: string) => {
    
    debugLog("updateObjectInputFormValue", { name, value, type, object, attributeType, objectConfiguration })
    const currentObjectConfiguration=objectConfiguration.filter(o=>o.name===name)||[]
    if(currentObjectConfiguration.length>0){
      const valueIsValid = validate(currentObjectConfiguration[0].validation,value)
      debugLog("updateObjectInputFormValue (isValid)",valueIsValid)
      if(!valueIsValid) {
        const validationHelperText = vHelperText(currentObjectConfiguration[0].validation,value)
        debugLog("updateObjectInputFormValue (vHelperText)",validationHelperText)
        setUsedHelperText(validationHelperText)
      }
      
    }
    if(currentObjectConfiguration[0].trim&&currentObjectConfiguration[0].trim==='cert') {
      const trimmeValue=trimCertificate(value);
      currentObjectRef.current[name]=trimmeValue;
      onUpdate(name,trimmeValue)
    } else {
      currentObjectRef.current[name]=value;
      onUpdate(name,value)
    }
    
  }

  const updateObjectSwitchFormValue = (name: string,value: boolean,type: string) => {
    debugLog("updateObjectSwitchFormValue (name)",name)
    debugLog("updateObjectSwitchFormValue (value)",value)
    debugLog("updateObjectSwitchFormValue (type)",type)
    currentObjectRef.current[name]=value;
    debugLog("updateObjectSwitchFormValue (currentObjectRef.current)",redactSecrets(currentObjectRef.current))
    onUpdate(name,String(value))
    
  }

  const deleteObject = (index:number) => {
    debugLog("deleteObject (index)",index)
    onDelete(object.type,index);
  };

  const editObject = (name:string | undefined,index:number) => {
    debugLog("editObject", { name, index, object, editedContent: object.content[index] })
    onEdit(object.type,object.content[index],index);
    
  };
  
  if(isEditable) {
    
    return (<Grid key={object.name} container >
      
      {object.content.length===0&&mandatory&&(<Grid size={12}><Box sx={{ color: "#db2828" }}><FormattedMessage defaultMessage="ei arvoja, pakollinen" /></Box></Grid>)
          }
          {object.content.length===0&&!mandatory&&(<Grid size={12}><FormattedMessage defaultMessage="ei arvoja" /></Grid>)
          }
        {object.content.map((content:MetadataEntry,index:number)=>{
            return(<Grid key={object.name+"_"+index} container size={12} spacing={2} >
                        <Grid size={11}>
                            <span >{JSON.stringify(content, null, 2).replace(/^{/g, '').replace(/}$/g, '\n')}</span>
                        </Grid>
                        <Grid size={1}>
                            <IconButton 
                                key="muokkaa"
                                aria-label={intl.formatMessage({
                                defaultMessage: "muokkaa",
                                })}
                                onClick={()=>editObject(object.name,index)} >
                                <EditIcon />
                            </IconButton>
                            <IconButton 
                                key="poista"
                                aria-label={intl.formatMessage({
                                defaultMessage: "poista",
                                })}
                                onClick={()=>deleteObject(index)} >
                                <ClearIcon />
                            </IconButton>
                            
                        </Grid>
                    </Grid>)
        })}
        {objectConfiguration
          //.filter((configuration) => (environmentConfiguration.includes(configuration.name)&&configuration.environment===environment)||(!environmentConfiguration.includes(configuration.name)&&configuration.environment===undefined))
          //.filter((configuration) => (specialConfiguration.includes(configuration.name)&&configuration.oid===oid)||(!specialConfiguration.includes(configuration.name)&&!configuration.oid))
          .map((configuration) => {
            const id = `attribuutti.${object.name}.${configuration.name}`;
            const label = id in intl.messages ? { id } : undefined;
            const tooltipId = `työkaluvihje.${object.name}.${configuration.name}`;
            const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
            return {
              ...configuration,
              label: label && intl.formatMessage(label),
              tooltip: tooltip && intl.formatMessage(tooltip)
            };
          })
          .filter(({ name }) => name)
          .sort(
            (a, b) => (a.label ?? a.name!).localeCompare(b.label ?? b.name!)
          )
          // currentObjectRef is a mutable store shared with Form/index.tsx:
          // the fields are initialized into it and read from it while
          // rendering. Moving it to state needs a redesign of both components,
          // left for later (decided 2026-10-14).
          // eslint-disable-next-line react-hooks/refs
          .map((configuration) => {
                  let resetSwitchValue=false;                
                  debugLog("ObjectForm (configuration)",configuration)                  

                  const validator = (value:string) => {
                    debugLog("validator (configuration.name)", configuration.name)
                    debugLog("validator (configuration)",configuration)
                    debugLog("validator (value)",value)
                    return validate(configuration.validation,value);
                  }

                  const helpGeneratorText = (value:string) => {
                    debugLog("helpGeneratorText (configuration.name)", configuration.name)
                    debugLog("helpGeneratorText (configuration)",configuration)
                    debugLog("helpGeneratorText (value)",value)
                    
                    return vHelperText(configuration.validation,value)
                  }
                                  
                  const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===integrationType) || defaultIntegrationType;
                  // The sub-field's own translation first, then the object's one (as before).
                  const fieldLabel = configuration.label ?? (label ? intl.formatMessage(label) : undefined);

                  debugLog("ObjectForm (roleConfiguration)",roleConfiguration) 
                  //configuration.integrationType.find(i=>i.name===integrationType)
                  const attribute = { type: configuration.type, 
                                          content: createAttributeContent(configuration.name,inputValue,currentObjectRef,roleConfiguration),
                                          name: configuration.name}
                  
                  if(!Object.prototype.hasOwnProperty.call(currentObjectRef.current, configuration.name)) {
                    debugLog("ObjectForm (reset)",configuration.name)   
                    if(roleConfiguration.defaultValue !== undefined) {
                      attribute.content=roleConfiguration?.defaultValue
                    } else {
                      attribute.content=''
                    }                
                    
                  } 

                  //If not default value for switch, then take first enum
                  if(configuration.switch&&configuration?.enum?.length===2&&attribute.content==='') {
                    debugLog("ObjectForm (SwitchForm init)",redactSecretValue(attribute.name,attribute.content))
                    attribute.content=configuration.enum[0];
                  }
                  
                  //if(configuration?.enum?.length===2&&configuration.array===false&&!Object.prototype.hasOwnProperty.call(currentObjectRef.current, configuration.name)) {
                  if(configuration.switch&&configuration?.enum?.length===2&&configuration.array===false) {
                    debugLog("ObjectForm (switch init)",configuration.name)                    
                    debugLog("ObjectForm (switch init attribute.content value)",redactSecretValue(attribute.name,attribute.content));
                    debugLog("ObjectForm (switch init)",(String(attribute.content).toLowerCase() === 'true'));
                    currentObjectRef.current[configuration.name]=(String(attribute.content).toLowerCase() === 'true');
                    debugLog("ObjectForm (SwitchForm resetValue)",true)
                    resetSwitchValue=true
                    //updateObjectSwitchFormValue(configuration.name,attribute.content,attribute.type)
                  }
                  
                  debugLog("ObjectForm (attribute init)",redactSecrets(attribute))  
                  debugLog("ObjectForm (currentObjectRef.current)",redactSecrets(currentObjectRef.current))  
                    
                    //Initialize array currentObjectRef
                    if(configuration.array&&!Object.prototype.hasOwnProperty.call(currentObjectRef.current, configuration.name)) {
                        debugLog("ObjectForm (array init)",configuration.name)  
                        currentObjectRef.current[configuration.name]=attribute.content||[];
                        attribute.content=currentObjectRef.current[configuration.name];
                    }
                    
                    //Initialize siglevalue currentObjectRef
                    if(!configuration.array&&!Object.prototype.hasOwnProperty.call(currentObjectRef.current, configuration.name)) {
                        debugLog("ObjectForm (siglevalue init)",configuration.name)                             
                        currentObjectRef.current[configuration.name]=attribute.content||'';
                    }    

                    
                    
                    if(roleConfiguration?.index&&roleConfiguration.index==='auto') {
                        debugLog("ObjectForm (index init)",configuration.name)
                        let newIndex=0
                        let newIndexFound=false
                        object.content.forEach((element: MetadataEntry) => {
                          if(!newIndexFound) {                    
                            if(element[configuration.name]!==undefined&&newIndex===element[configuration.name]) {
                              newIndex++
                            } else {
                              if(object.content.filter((o:MetadataEntry)=>o[configuration.name]!==undefined&&newIndex===o[configuration.name]).length===0) {
                                newIndexFound=true;                            
                              } else {
                                newIndex++
                              }
                              
                            }
                          }
                      });
                      
                      attribute.content=String(newIndex);
                      currentObjectRef.current[configuration.name]=newIndex;
                    }

                    if(roleConfiguration?.index&&roleConfiguration.index==='randomsha1') {
                      debugLog("ObjectForm (index init)",configuration.name)
                      calculateSHA1(String(getRandom())).then(sha=>{
                        attribute.content=String(sha);
                        currentObjectRef.current[configuration.name]=sha;
                      })
                      
                    
                    
                  }

                    if(inputValue.current&&Object.prototype.hasOwnProperty.call(inputValue.current, configuration.name)){
                      debugLog("ObjectForm (reset)",configuration.name)
                      debugLog("ObjectForm (inputValue.current)",redactSecretValue(configuration.name,inputValue.current[configuration.name]))
                      currentObjectRef.current[configuration.name]=inputValue.current[configuration.name]
                      attribute.content=inputValue.current[configuration.name]
                      delete inputValue.current[configuration.name]
                      debugLog("ObjectForm (inputValue.current)",inputValue.current)
                      debugLog("ObjectForm editObject (inputValue.current)",redactSecrets(attribute))
                      debugLog("ObjectForm (inputValue.current)",redactSecrets(currentObjectRef.current))
                      //setReload(!reload)
                    }
                    
                    //setCanSave(validateObject())
                    debugLog("ObjectForm (currentObjectRef post)",redactSecrets(currentObjectRef.current))
                    debugLog("ObjectForm (attribute post)",redactSecrets(attribute))                                        
                  
                    if(roleConfiguration.visible) {
                      return (
                        <Grid key={object.name+"."+configuration.name} container size={12} >
                            <Grid container size={12} spacing={2} sx={{ mb: 3 }} >
                                <Grid size={4}>
                                    <Tooltip
                                        title={
                                            <>
                                            {configuration.tooltip && (
                                                <Box sx={{ mb: 1 }}>
                                                {configuration.tooltip}
                                                </Box>
                                            )}
                                            <code>{configuration.name}</code>
                                            </>
                                        }
                                        >
                                        <span>{fieldLabel ?? configuration.name}</span>
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
                                        {configuration&&roleConfiguration&&configuration.switch&&configuration.enum&&configuration.enum.length===2&&
                                        (<SwitchForm key={object.name}                                             
                                            object={attribute} 
                                            resetValue={resetSwitchValue}
                                            path="content" 
                                            type={configuration.name!} 
                                            values={configuration.enum}
                                            isEditable={roleConfiguration.editable} 
                                            onUpdate={updateObjectSwitchFormValue} 
                                            onValidate={onValidate} 
                                            mandatory={configuration.mandatory}
                                            label={fieldLabel ?? object.name!}
                                            attributeType={configuration.type}
                                            helperText={helperText}
                                            setCanSave={setCanSave}/>)
                                        }                                    
                                        {configuration&&roleConfiguration&&!configuration.array&&!configuration.enum&&
                                        (<InputForm key={object.name} 
                                            reload={reload}
                                            object={attribute} 
                                            path="content" 
                                            noErros={true}
                                            type={configuration.name!} 
                                            isEditable={roleConfiguration.editable} 
                                            onUpdate={updateObjectInputFormValue} 
                                            onValidate={validator} 
                                            mandatory={configuration.mandatory}
                                            label={fieldLabel ?? configuration.name!}
                                            attributeType={configuration.type}
                                            helperText={helpGeneratorText}
                                            setCanSave={setCanSave}/>)
                                        }    
                                        
                                        {configuration&&roleConfiguration&&configuration.array&&!configuration.enum&&
                                        (<ListForm key={object.name}
                                          // configuration.array without enum/object: a list of strings
                                          object={attribute as FormObject<string[]> & { content: string[] }}
                                          type={object.name!}
                                          isEditable={roleConfiguration.editable}
                                          mandatory={configuration.mandatory}
                                          label={fieldLabel ?? object.name!}
                                          attributeType={configuration.type}
                                          onValidate={onValidate}
                                          helperText={helpGeneratorText}
                                          
                                          setCanSave={setCanSave} onUpdate={function (_name: string, _data: string): void {
                                              throw new Error("Function not implemented.");
                                          } }/>)}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>)
                    } else {
                      return(<></>)
                    }
                  
            })  
        }
                
           
            </Grid>
    );
  } else {
    
    // Lukutila: samat arvot samassa muodossa kuin muokkaustilassa, ilman
    // muokkaus-/poistopainikkeita ja alikenttien syöttörivejä. Tyhjä lista ei
    // näytä mitään - sama linja kuin ListForm.tsx:n ja InputForm.tsx:n
    // lukutilahaaroissa.
    return( <Box
      sx={(theme) => ({
        ...theme.typography.body1
        
      })}
    >{object.content.map((content:unknown,index:number)=>(
        <Box key={object.name+"_"+index}>
          <span>{JSON.stringify(content, null, 2).replace(/^{/g, '').replace(/}$/g, '\n')}</span>
        </Box>
      ))}</Box>)
  }
  
}
