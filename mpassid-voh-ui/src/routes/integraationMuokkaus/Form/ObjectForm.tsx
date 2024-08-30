
import { Box, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import type { IntegrationType, UiConfiguration } from "@/config";
import { dataConfiguration, defaultIntegrationType } from "@/config";
import { helperText as vHelperText, validate } from "@/utils/Validators";
import SwitchForm from "./SwitchForm";
import ListForm from "./ListForm";
import InputForm from "./InputForm";
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import { devLog } from "@/utils/devLog";

interface Props {
  object: any;
  type: string;
  label: string;
  attributeType: string;
  integrationType: string;
  isEditable: boolean;
  mandatory: boolean;
  path: any;
  currentObject: any;
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: string) => void;
  onEdit: (name: string,value: string) => void;
  onDelete: (name: string,index: number) => void;
  onValidate: (data:string) => boolean;
}

  
export default function ObjectForm({ object, type, isEditable=false, mandatory=false,helperText, path, onUpdate, onEdit, onDelete, onValidate, attributeType,setCanSave, currentObject, integrationType }: Props) {
  const intl = useIntl();
  const id = `attribuutti.${object.name}`;
  const tooltipId = `työkaluvihje.${object.name}`;
  const label = id in intl.messages ? { id } : undefined;
  const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
  const objectConfiguration:UiConfiguration[] = dataConfiguration.filter(conf=>conf.type===object.name) || [];
  //const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  //const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const mandatoryAttributes:string[] = [];
  

  
  //const roleConfiguration:IntegrationType=objectConfiguration.filter(c=>c.name===object.name)[0].integrationType.find(i=>i.name===integrationType) || defaultIntegrationType;
  //const roleConfiguration:IntegrationType=defaultIntegrationType;
  
  const [isValid, setIsValid] = useState(true);
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const inputRef = useRef<HTMLFormElement>(null);
  const inputValue = useRef<any>(null);
  
  useEffect(() => {
    if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
      setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: String(label)}} />)
      setIsValid(false)      
      setCanSave(false)  
    }
    
  }, [ label, mandatory, setUsedHelperText, setIsValid, setCanSave ]);

  const validateObject = () => {
    var result=true;
    mandatoryAttributes.forEach(ma=>{
      
      devLog("validateObject (mandatoryAttribute)",ma)
      devLog("validateObject (mandatoryAttribute)",object)
      /*
      devLog("validateMetadata (mandatoryAttribute "+ma+")",metadata[ma])
      if(metadata[ma] === undefined) {
        result = false
      }
      if(metadata[ma] !== undefined&&metadata[ma].length===0) {
        result = false
      }
      */
    })
    
    return result
  }
  
  const updateObjectInputFormValue = (name: string,value: string,type: string) => {
    
    devLog("updateObjectInputFormValue (name)",name)
    devLog("updateObjectInputFormValue (value)",value)
    devLog("updateObjectInputFormValue (type)",type)
    devLog("updateObjectInputFormValue (object)",object)
    devLog("updateObjectInputFormValue (attributeType)",attributeType)
    devLog("updateObjectInputFormValue (objectConfiguration)",objectConfiguration)
    var currentObjectConfiguration=objectConfiguration.filter(o=>o.name===name)||[]
    if(currentObjectConfiguration.length>0){
      devLog("updateObjectInputFormValue (isValid)",validate(currentObjectConfiguration[0].validation,value))
      if(!validate(currentObjectConfiguration[0].validation,value)) {
        devLog("updateObjectInputFormValue (vHelperText)",vHelperText(currentObjectConfiguration[0].validation,value))
        setUsedHelperText(vHelperText(currentObjectConfiguration[0].validation,value))
      }
      
    }
    
    currentObject.current[name]=value;
    onUpdate(name,value)
  }

  const updateObjectSwitchFormValue = (name: string,value: string,type: string) => {
    
    currentObject.current[name]=value;
    
  }

  /*
  const updateFormValue = () => {
    if(onValidate(inputRef.current?.value)) {
      setIsValid(true)
      if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
        setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: String(label)}} />)
        setIsValid(false)
        setCanSave(false)  
        onUpdate(type,"");
      } else {
        setCanSave(true) 
        if(inputRef.current?.value) {
          onUpdate(type,inputRef.current.value);  
        } else {
          onUpdate(type,"");
        }
        setUsedHelperText(<></>)
      }
      
    } else {
      setUsedHelperText(helperText(inputRef.current?.value))
      setIsValid(false)  
      setCanSave(false)
      onUpdate(type,"");
    }
  };
  */
  const deleteObject = (index:number) => {
    devLog("deleteObject (index) ",index)
    onDelete(object.type,index);
  };

  const editObject = (name:string,index:number) => {
    devLog("editObject (name) ",name)
    devLog("editObject (index) ",index)
    devLog("editObject (object) ",object)
    devLog("editObject (edited content) ",object.content[index])
    /*
    devLog("editObject (inputValue) ",inputValue.current)
    if(!inputValue.current){
      inputValue.current={}
    }
    inputValue.current[name]=clone(object.content[index]);
    */
    //onDelete(object.type,index);
    onEdit(object.type,object.content[index]);
    //devLog("editObject (inputValue) 2",inputValue.current)
    
  };
  
  if(isEditable) {
    devLog("updateMultivalueMetadata looppi (objectForm)",object.content)
    return (<Grid container >
      
      {object.content.length===0&&mandatory&&(<Box sx={{ color: "#db2828" }}><FormattedMessage defaultMessage="ei arvoja, pakollinen" /></Box>)
          }
          {object.content.length===0&&!mandatory&&(<FormattedMessage defaultMessage="ei arvoja" />)
          }
        {object.content.map((content:any,index:number)=>{
            return(<Grid key={object.name+"_"+index} container spacing={2} >
                        <Grid item xs={11}>
                            <span >{JSON.stringify(content, null, 2).replace(/^{/g, '').replace(/}$/g, '\n')}</span>
                        </Grid>
                        <Grid item xs={1}>
                            <IconButton 
                                aria-label={intl.formatMessage({
                                defaultMessage: "muokkaa",
                                })}
                                onClick={(e)=>editObject(object.name,index)} >
                                <EditIcon />
                            </IconButton>
                            <IconButton 
                                aria-label={intl.formatMessage({
                                defaultMessage: "poista",
                                })}
                                onClick={(e)=>deleteObject(index)} >
                                <ClearIcon />
                            </IconButton>
                            
                        </Grid>
                    </Grid>)
        })}
        {objectConfiguration
          //.filter((configuration) => (environmentConfiguration.includes(configuration.name)&&configuration.environment===environment)||(!environmentConfiguration.includes(configuration.name)&&configuration.environment===undefined))
          //.filter((configuration) => (specialConfiguration.includes(configuration.name)&&configuration.oid===oid)||(!specialConfiguration.includes(configuration.name)&&!configuration.oid))
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
            (a, b) => (a.label ?? a.name!).localeCompare(b.label ?? b.name!)
          )
          .map((configuration) => {
                    
            //console.log("***** ObjectForm (configuration): ",configuration)

                  if(configuration.mandatory) {
                    mandatoryAttributes.push(configuration.name);
                  }

                  const validator = (value:string) => {
                    devLog("validator ( configuration.name)", configuration.name)
                    devLog("validator (configuration)",configuration)
                    devLog("validator (value)",value)
                    return validate(configuration.validation,value);
                  }

                  const helpGeneratorText = (value:string) => {
                    devLog("helpGeneratorText ( configuration.name)", configuration.name)
                    devLog("helpGeneratorText (configuration)",configuration)
                    devLog("helpGeneratorText (value)",value)
                    
                    return vHelperText(configuration.validation,value)
                  }
                  
                  console.log("**** ObjectForm (configuration): ",configuration)
                  console.log("**** ObjectForm (object): ",object)
                  console.log("**** ObjectForm (integrationType): ",integrationType)


                  console.log("ObjectForm 1: ",object)
                  console.log("ObjectForm 2: ",configuration)
                  console.log("ObjectForm 3: ",configuration.integrationType.find(c=>c.name===integrationType))
                                  
                  const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===integrationType) || defaultIntegrationType;

                  devLog("roleConfiguration",roleConfiguration)
                  devLog("inputValue.current",inputValue.current)

                  configuration.integrationType.filter(i=>i.name===integrationType)
                  const attribute = { type: configuration.type, 
                                          content: roleConfiguration?.defaultValue||'',
                                          name: configuration.name}

                    
                    
                    if(configuration.multivalue&&!currentObject.current.hasOwnProperty(configuration.name)) {
                        currentObject.current[configuration.name]=[];
                    }
                    /*
                    if(configuration?.enum?.length===2&&!currentObject.current.hasOwnProperty(configuration.name)) {
                        currentObject.current[configuration.name]=configuration.enum[0];
                    }
                        */
                    if(!configuration.multivalue&&!currentObject.current.hasOwnProperty(configuration.name)) {
                        currentObject.current[configuration.name]=roleConfiguration?.defaultValue||'';
                    }    
                    if(roleConfiguration?.index&&roleConfiguration.index==='auto') {
                      
                      var newIndex=0
                      var newIndexFound=false
                      object.content.forEach((element: any) => {
                        if(!newIndexFound) {                    
                          if(element[configuration.name]!==undefined&&newIndex===element[configuration.name]) {
                            newIndex++
                          } else {
                            newIndexFound=true;
                          }
                        }
                        
                      });
                      
                      attribute.content=String(newIndex);
                      currentObject.current[configuration.name]=newIndex;
                    }

                    if(inputValue.current&&inputValue.current[object.name]) {
                      console.log("********************* configuration.name",configuration.name)
                      console.log("********************* currentObject.current[configuration.name]",currentObject.current[configuration.name])
                      console.log("********************* inputValue.current[object.name]",inputValue.current[object.name][configuration.name])
                      attribute.content=inputValue.current[object.name][configuration.name];
                    }
                    setCanSave(validateObject())
                    devLog("objectForm",currentObject.current)
                  
                    if(roleConfiguration.visible) {
                      return (
                        <Grid key={configuration.name} container >
                            <Grid container spacing={2} mb={3} >
                                <Grid item xs={4}>
                                    <Tooltip
                                        title={
                                            <>
                                            {tooltip && (
                                                <Box mb={1}>
                                                <FormattedMessage {...tooltip} />
                                                </Box>
                                            )}
                                            <code>{object.name+"."+configuration.name}</code>
                                            </>
                                        }
                                        >
                                        <span>{label ? <FormattedMessage {...label} /> : configuration.name}</span>
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
                                        {configuration&&roleConfiguration&&configuration.enum&&configuration.enum.length===2&&
                                        (<SwitchForm key={object.name} 
                                            object={object} 
                                            path="content" 
                                            type={configuration.name!} 
                                            values={configuration.enum}
                                            isEditable={roleConfiguration.editable} 
                                            onUpdate={updateObjectSwitchFormValue} 
                                            onValidate={onValidate} 
                                            mandatory={configuration.mandatory}
                                            label={label?intl.formatMessage(label):object.name!}
                                            attributeType={configuration.type}
                                            helperText={helperText}
                                            setCanSave={setCanSave}/>)
                                        }                                    
                                        {configuration&&roleConfiguration&&!configuration.multivalue&&!configuration.enum&&
                                        (<InputForm key={object.name} 
                                            object={attribute} 
                                            path="content" 
                                            type={configuration.name!} 
                                            isEditable={roleConfiguration.editable} 
                                            onUpdate={updateObjectInputFormValue} 
                                            onValidate={validator} 
                                            mandatory={configuration.mandatory}
                                            label={label?intl.formatMessage(label):configuration.name!}
                                            attributeType={configuration.type}
                                            helperText={helpGeneratorText}
                                            setCanSave={setCanSave}/>)
                                        }    
                                        
                                        {configuration&&roleConfiguration&&configuration.multivalue&&!configuration.enum&&
                                        (<ListForm key={object.name}
                                          object={attribute}
                                          type={object.name!}
                                          isEditable={roleConfiguration.editable}
                                          mandatory={configuration.mandatory}
                                          label={label ? intl.formatMessage(label) : object.name!}
                                          attributeType={configuration.type}
                                          onValidate={onValidate}
                                          helperText={helpGeneratorText}
    
                                          setCanSave={setCanSave} onUpdate={function (name: string, data: any): void {
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
    
    return( <Box
      sx={(theme) => ({
        ...theme.typography.body1
        
      })}
    >{"aaaa"}</Box>)
  }
  
}
