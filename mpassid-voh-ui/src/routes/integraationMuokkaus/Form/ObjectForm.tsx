
import { Box, Grid, IconButton, Tooltip, Typography } from "@mui/material";
import type { Dispatch} from "react";
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
  dataConfiguration: UiConfiguration[];
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: string) => void;
  onEdit: (name: string,value: string,index: number) => void;
  onDelete: (name: string,index: number) => void;
  onValidate: (data:string) => boolean;
  objectData?: any;
}

  
export default function ObjectForm({ object, type, isEditable=false, mandatory=false,helperText, path, onUpdate, onEdit, onDelete, onValidate, attributeType,setCanSave, currentObject, integrationType, objectData,dataConfiguration }: Props) {
  const intl = useIntl();
  const id = `attribuutti.${object.name}`;
  //const tooltipId = `työkaluvihje.${object.name}`;
  const label = id in intl.messages ? { id } : undefined;
  //const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
  const objectConfiguration:UiConfiguration[] = dataConfiguration.filter(conf=>conf.type===object.name) || [];
  //const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  //const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const allAttributes:string[] = [];
  

  
  //const roleConfiguration:IntegrationType=objectConfiguration.filter(c=>c.name===object.name)[0].integrationType.find(i=>i.name===integrationType) || defaultIntegrationType;
  //const roleConfiguration:IntegrationType=defaultIntegrationType;
  
  const [isValid, setIsValid] = useState(true);
  const [reload, setReload] = useState(true);
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

  useImperativeHandle(objectData, (editObject?:any) => ({
    clean() {
      devLog("DEBUG","ObjectForm (clean)",object)
      devLog("DEBUG","ObjectForm (clean)",currentObject.current)

      setReload(!reload)
      currentObject.current={}
      setCanSave(validateObject())
      devLog("DEBUG","ObjectForm (clean)",currentObject.current)
      
    },
    validate() {
      devLog("DEBUG","ObjectForm (validateObject)",currentObject.current)
      return validateObject()
    },
    edit(editObject?:any) {
      devLog("DEBUG","ObjectForm (editObject)",editObject)
      inputValue.current=editObject
      //setReload(!reload)
    }
    
  }));

  const createAttributeContent = (name:string,inputValue: React.MutableRefObject<any>,currentObject: React.MutableRefObject<any>,roleConfiguration:IntegrationType) => {
    devLog("DEBUG","createAttributeContent (name)",name)
    if(inputValue.current&&inputValue.current[name]) {
      devLog("DEBUG","createAttributeContent (inputValue)",inputValue.current[name])
      return inputValue.current[name]
    }
    
    if(currentObject.current&&currentObject.current[name]!== undefined) {
      devLog("DEBUG","createAttributeContent (currentObject)",currentObject.current[name])
      return currentObject.current[name]
    }
    if(roleConfiguration?.defaultValue) {
      devLog("DEBUG","createAttributeContent (defaultValue)",roleConfiguration.defaultValue)
      return roleConfiguration.defaultValue
    }
    devLog("DEBUG","createAttributeContent (empty)",'')
    return ''
  }

  const validateObject = () => {
    var result=true;
    
    objectConfiguration.forEach(configuration=>{
      const name=configuration.name
      devLog("DEBUG","validateObject (attribute "+name+")",currentObject.current[name])
    
      if(configuration) {
        if((currentObject.current[name] === undefined|| currentObject.current[name].length===0) && configuration.mandatory ){
          result = false
        } else {        
          result = validate(configuration.validation,currentObject.current[name])         
        }
      } else {
        result = true
      }      
    })
    
    devLog("DEBUG","validateObject (result)",result)
    return result
  }
  
  const updateObjectInputFormValue = (name: string,value: string,type: string) => {
    
    devLog("DEBUG","updateObjectInputFormValue (name)",name)
    devLog("DEBUG","updateObjectInputFormValue (value)",value)
    devLog("DEBUG","updateObjectInputFormValue (type)",type)
    devLog("DEBUG","updateObjectInputFormValue (object)",object)
    devLog("DEBUG","updateObjectInputFormValue (attributeType)",attributeType)
    devLog("DEBUG","updateObjectInputFormValue (objectConfiguration)",objectConfiguration)
    var currentObjectConfiguration=objectConfiguration.filter(o=>o.name===name)||[]
    if(currentObjectConfiguration.length>0){
      devLog("DEBUG","updateObjectInputFormValue (isValid)",validate(currentObjectConfiguration[0].validation,value))
      if(!validate(currentObjectConfiguration[0].validation,value)) {
        devLog("DEBUG","updateObjectInputFormValue (vHelperText)",vHelperText(currentObjectConfiguration[0].validation,value))
        setUsedHelperText(vHelperText(currentObjectConfiguration[0].validation,value))
      }
      
    }
    if(currentObjectConfiguration[0].trim&&currentObjectConfiguration[0].trim==='cert') {
      const trimmeValue=trimCertificate(value);
      currentObject.current[name]=trimmeValue;
      onUpdate(name,trimmeValue)
    } else {
      currentObject.current[name]=value;
      onUpdate(name,value)
    }
    
  }

  const updateObjectSwitchFormValue = (name: string,value: boolean,type: string) => {
    devLog("DEBUG","updateObjectSwitchFormValue (name)",name)
    devLog("DEBUG","updateObjectSwitchFormValue (value)",value)
    devLog("DEBUG","updateObjectSwitchFormValue (type)",type)
    currentObject.current[name]=value;
    devLog("DEBUG","updateObjectSwitchFormValue (currentObject.current)",currentObject.current)
    onUpdate(name,String(value))
    
  }

  const deleteObject = (index:number) => {
    devLog("DEBUG","deleteObject (index) ",index)
    onDelete(object.type,index);
  };

  const editObject = (name:string,index:number) => {
    devLog("DEBUG","editObject (name) ",name)
    devLog("DEBUG","editObject (index) ",index)
    devLog("DEBUG","editObject (object) ",object)
    devLog("DEBUG","editObject (edited content) ",object.content[index])
    onEdit(object.type,object.content[index],index);
    
  };
  
  if(isEditable) {
    
    return (<Grid key={object.name} container >
      
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
                                key="muokkaa"
                                aria-label={intl.formatMessage({
                                defaultMessage: "muokkaa",
                                })}
                                onClick={(e)=>editObject(object.name,index)} >
                                <EditIcon />
                            </IconButton>
                            <IconButton 
                                key="poista"
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
          .map((configuration) => {
                  var resetSwitchValue=false;                
                  devLog("DEBUG","ObjectForm (configuration)",configuration)                  

                  const validator = (value:string) => {
                    devLog("DEBUG","validator ( configuration.name)", configuration.name)
                    devLog("DEBUG","validator (configuration)",configuration)
                    devLog("DEBUG","validator (value)",value)
                    return validate(configuration.validation,value);
                  }

                  const helpGeneratorText = (value:string) => {
                    devLog("DEBUG","helpGeneratorText ( configuration.name)", configuration.name)
                    devLog("DEBUG","helpGeneratorText (configuration)",configuration)
                    devLog("DEBUG","helpGeneratorText (value)",value)
                    
                    return vHelperText(configuration.validation,value)
                  }
                                  
                  const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===integrationType) || defaultIntegrationType;

                  devLog("DEBUG","ObjectForm (roleConfiguration)",roleConfiguration) 
                  //configuration.integrationType.find(i=>i.name===integrationType)
                  const attribute = { type: configuration.type, 
                                          content: createAttributeContent(configuration.name,inputValue,currentObject,roleConfiguration),
                                          name: configuration.name}
                  
                  if(!currentObject.current.hasOwnProperty(configuration.name)) {
                    devLog("DEBUG","ObjectForm (reset)",configuration.name)   
                    if(roleConfiguration.defaultValue !== undefined) {
                      attribute.content=roleConfiguration?.defaultValue
                    } else {
                      attribute.content=''
                    }                
                    
                  } 

                  //If not default value for switch, then take first enum
                  if(configuration.switch&&configuration?.enum?.length===2&&attribute.content==='') {
                    devLog("DEBUG","ObjectForm (SwitchForm init)",attribute.content)
                    attribute.content=configuration.enum[0];
                  }
                  
                  //if(configuration?.enum?.length===2&&configuration.array===false&&!currentObject.current.hasOwnProperty(configuration.name)) {
                  if(configuration.switch&&configuration?.enum?.length===2&&configuration.array===false) {
                    devLog("DEBUG","ObjectForm (switch init)",configuration.name)                    
                    devLog("DEBUG","ObjectForm (switch init attribute.content value)",attribute.content);
                    devLog("DEBUG","ObjectForm (switch init)",(String(attribute.content).toLowerCase() === 'true'));
                    currentObject.current[configuration.name]=(String(attribute.content).toLowerCase() === 'true');
                    devLog("DEBUG","ObjectForm (SwitchForm resetValue)",true)
                    resetSwitchValue=true
                    //updateObjectSwitchFormValue(configuration.name,attribute.content,attribute.type)
                  }
                  
                  devLog("DEBUG","ObjectForm (attribute init)",attribute)  
                  devLog("DEBUG","ObjectForm (currentObject.current)",currentObject.current)  
                    
                    //Initialize array currentObject
                    if(configuration.array&&!currentObject.current.hasOwnProperty(configuration.name)) {
                        devLog("DEBUG","ObjectForm (array init)",configuration.name)  
                        currentObject.current[configuration.name]=attribute.content||[];
                    }
                    
                    //Initialize siglevalue currentObject
                    if(!configuration.array&&!currentObject.current.hasOwnProperty(configuration.name)) {
                        devLog("DEBUG","ObjectForm (siglevalue init)",configuration.name)                             
                        currentObject.current[configuration.name]=attribute.content||'';
                    }    

                    
                    
                    if(roleConfiguration?.index&&roleConfiguration.index==='auto') {
                        devLog("DEBUG","ObjectForm (index init)",configuration.name)
                        var newIndex=0
                        var newIndexFound=false
                        object.content.forEach((element: any) => {
                          if(!newIndexFound) {                    
                            if(element[configuration.name]!==undefined&&newIndex===element[configuration.name]) {
                              newIndex++
                            } else {
                              if(object.content.filter((o:any)=>o[configuration.name]!==undefined&&newIndex===o[configuration.name]).length===0) {
                                newIndexFound=true;                            
                              } else {
                                newIndex++
                              }
                              
                            }
                          }
                      });
                      
                      attribute.content=String(newIndex);
                      currentObject.current[configuration.name]=newIndex;
                    }

                    if(roleConfiguration?.index&&roleConfiguration.index==='randomsha1') {
                      devLog("DEBUG","ObjectForm (index init)",configuration.name)
                      calculateSHA1(String(getRandom())).then(sha=>{
                        attribute.content=String(sha);
                        currentObject.current[configuration.name]=sha;
                      })
                      
                    
                    
                  }

                    if(inputValue.current&&inputValue.current.hasOwnProperty(configuration.name)){
                      devLog("DEBUG","ObjectForm (reset)",configuration.name)
                      devLog("DEBUG","ObjectForm (inputValue.current)",inputValue.current[configuration.name])
                      currentObject.current[configuration.name]=inputValue.current[configuration.name]
                      attribute.content=inputValue.current[configuration.name]
                      delete inputValue.current[configuration.name]
                      devLog("DEBUG","ObjectForm (inputValue.current)",inputValue.current)
                      devLog("DEBUG","ObjectForm editObject (inputValue.current)",attribute)
                      devLog("DEBUG","ObjectForm (inputValue.current)",currentObject.current)
                      //setReload(!reload)
                    }
                    
                    //setCanSave(validateObject())
                    devLog("DEBUG","ObjectForm (currentObject post)",currentObject.current)
                    devLog("DEBUG","ObjectForm (attribute post)",attribute)                                        
                  
                    if(roleConfiguration.visible) {
                      return (
                        <Grid key={object.name+"."+configuration.name} container >
                            <Grid container spacing={2} mb={3} >
                                <Grid item xs={4}>
                                    <Tooltip
                                        title={
                                            <>
                                            {configuration.tooltip && (
                                                <Box mb={1}>
                                                {configuration.tooltip}
                                                </Box>
                                            )}
                                            <code>{configuration.name}</code>
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
                                            label={label?intl.formatMessage(label):object.name!}
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
                                            label={label?intl.formatMessage(label):configuration.name!}
                                            attributeType={configuration.type}
                                            helperText={helpGeneratorText}
                                            setCanSave={setCanSave}/>)
                                        }    
                                        
                                        {configuration&&roleConfiguration&&configuration.array&&!configuration.enum&&
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
