
import { Box, Grid, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from "lodash";
import type { Components } from '@/api';
import type { IntegrationType, UiConfiguration } from "@/config";
import { dataConfiguration, defaultIntegrationType } from "@/config";
import { helperText, validate } from "@/utils/Validators";
import SwitchForm from "./SwitchForm";
import ListForm from "./ListForm";
import InputForm from "./InputForm";
import ClearIcon from '@mui/icons-material/Clear';

interface Props {
  object: any;
  type: string;
  label: string;
  attributeType: string;
  isEditable: boolean;
  mandatory: boolean;
  path: any;
  currentObject: any;
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: string) => void;
  onValidate: (data:string) => boolean;
}

export default function ObjectForm({ object, type, isEditable=false, mandatory=false, helperText, path, onUpdate, onValidate, attributeType,setCanSave, currentObject }: Props) {
  const intl = useIntl();
  const id = `attribuutti.${object.name}`;
  const tooltipId = `työkaluvihje.${object.name}`;
  const label = id in intl.messages ? { id } : undefined;
  const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;
  const objectConfiguration:UiConfiguration[] = dataConfiguration.filter(conf=>conf.type===object.name) || [];
  //const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  //const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const mandatoryAttributes:string[] = [];
  //const roleConfiguration:IntegrationType=objectConfiguration.filter(c=>c.name===object.name)[0].integrationType.find(i=>i.name===type) || defaultIntegrationType;
  const roleConfiguration:IntegrationType=defaultIntegrationType;
  
  const [isValid, setIsValid] = useState(true);
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const inputRef = useRef<HTMLFormElement>(null);
  

  //console.log("***** ObjectForm (object): ",object)
  
  useEffect(() => {
    if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
      setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: String(label)}} />)
      setIsValid(false)      
      setCanSave(false)  
    }
    
  }, [ label, mandatory, setUsedHelperText, setIsValid, setCanSave ]);
  
  const updateObjectInputFormValue = (name: string,value: string,type: string) => {
    
    currentObject.current[name]=value;
    //console.log("********** currentObject: ",currentObject.current)
  }

  const updateObjectSwitchFormValue = (name: string,value: string,type: string) => {
    
    //console.log("*** updateObjectSwitchFormValue: ",name,value,type)
    currentObject.current[name]=value;
    //console.log("********** currentObject: ",currentObject.current)
  }

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

  const deleteObject = (index:number) => {
    object.content.splice(index, 1)
    onUpdate(object.type,object);
  };
  
  if(isEditable) {
    
    return (<Grid container >
        {object.content.map((content:any,index:number)=>{
            return(<Grid key={object.name+"_"+index} container spacing={2} >
                        <Grid item xs={11}>
                            <span >{JSON.stringify(content, null, 2).replace(/^{/g, '').replace(/}$/g, '\n')}</span>
                        </Grid>
                        <Grid item xs={1}>
                            <IconButton 
                                aria-label={intl.formatMessage({
                                defaultMessage: "lisää",
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
                    return validate(configuration.validation,value);
                  }

                  const helpGeneratorText = (value:string) => {
                    //return helperText(configuration.validation,value);
                  }
                  
                  const onObjectUpdate = (name:string,value:string) => {
                    
                    if(configuration?.enum&&configuration.enum.length>0) {
                      //return onUpdate(false,name,value);
                    } else {
                      if(configuration?.multivalue) {
                        return onUpdate(name,value);
                      } else {
                        //return onUpdate(false,name,value);
                      }  
                    }
                    
                  }
                  
                  //console.log("**** ObjectForm (configuration): ",configuration)
                  //console.log("**** ObjectForm (object): ",object)

                  const attribute = { type: configuration.type, 
                                          content: '',
                                          name: configuration.name}

                    

                    if(configuration.multivalue) {
                        currentObject.current[configuration.name]=[];
                    }
                    if(!configuration.multivalue) {
                        currentObject.current[configuration.name]='';
                    }
                    if(configuration?.enum?.length===2) {
                        currentObject.current[configuration.name]=configuration.enum[0];
                    }
                        

                
            
                  
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
                                        onValidate={onValidate} 
                                        mandatory={configuration.mandatory}
                                        label={label?intl.formatMessage(label):configuration.name!}
                                        attributeType={configuration.type}
                                        helperText={helperText}
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
                                      helperText={helperText}

                                      setCanSave={setCanSave} onUpdate={function (name: string, data: any): void {
                                          throw new Error("Function not implemented.");
                                      } }/>)}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Grid>)
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
