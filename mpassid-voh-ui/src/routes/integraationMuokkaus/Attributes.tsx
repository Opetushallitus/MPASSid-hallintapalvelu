import type { Components } from "@/api";
import type { IntegrationType, UiConfiguration } from "@/config";
import { defaultIntegrationType } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from 'react-intl';
import { useRef, type Dispatch} from "react";
import AttributeForm from "./Form";
import { helperText, validate } from "@/utils/Validators";
import { devLog } from "@/utils/devLog";
import { clone, cloneDeep } from "lodash";

interface Props {
  role?: any;
  oid: string;
  environment: number;
  attributes: Components.Schemas.Attribute[];
  attributeType: Components.Schemas.Attribute["type"];
  type: any;
  newConfigurationEntityData: Components.Schemas.ConfigurationEntity; 
  initAttributes:string[];
  dataConfiguration:UiConfiguration[];
  addInitAttributes: (attribute: Components.Schemas.Attribute) => void;             
  setAttributes: Dispatch<Components.Schemas.Attribute[]>;
  setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
  setCanSave: Dispatch<boolean>;
}

export default function Attributes({ attributes, role, type, attributeType, newConfigurationEntityData, setNewConfigurationEntityData,oid,environment, setCanSave, setAttributes, initAttributes, addInitAttributes, dataConfiguration }: Props) {
  const intl = useIntl();
  const configurations:UiConfiguration[] = dataConfiguration.filter(conf=>conf.integrationType.filter(i=>i.name===type).length>0)
  const specialConfiguration:string[] = configurations.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  const environmentConfiguration:string[] = configurations.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const attributeConfiguration=useRef<UiConfiguration[]>([]);
  const allAttributes:string[] = [];


  const validateAttributes = () => {
    var result=true;
    
    attributeConfiguration.current.forEach(configuration=>{
      if(result) {

        const name=configuration.name                  
        const currentAttribute=attributes.find(a=>a.name===name)

        if(currentAttribute) {
          if((currentAttribute.content === undefined || currentAttribute.content === ''|| (currentAttribute.content !== null && currentAttribute.content.length===0)) && configuration.mandatory ){
            result = false
          } else {                     
            if(currentAttribute.content) {
              result = validate(configuration.validation,currentAttribute.content)
            } else {
              //result = validate(configuration.validation,'')         
              result=true
            }
          } 
        } else {
          if(configuration.mandatory){
            result = false
          } else {                      
            //result = validate(configuration.validation,'')                                                 
            result=true
          } 
        }     
        //devLog("DEBUG","validateAttributes ("+name+")",result)             
      }      
    })
    
    return result
  }

  const updateAttribute = (name:string, value:string, type:string ) => { 
    if(name!==undefined&&value!==undefined&&value!==attributes.find(a=>a.name===name&&a.type===type)?.content) {
      devLog("DEBUG","updateAttribute ("+name+")",value) 
      const attributeList=cloneDeep(attributes);
      const index=attributeList.map(a=>a.name).indexOf(name);
      if(index>-1) {
        attributeList[index].content=value;
      } else {
        if(type==='data'||type==='user') {
          attributeList.push({type: type, name: name,content: value }) 
        }
      }
      
      if(newConfigurationEntityData.attributes !== undefined) {
        const configurationEntity = cloneDeep(newConfigurationEntityData)
        configurationEntity.attributes=cloneDeep(attributeList);
        setAttributes(attributeList)
        setNewConfigurationEntityData(configurationEntity)
      }

      if(validateAttributes()) {
        devLog("DEBUG","updateAttribute (validateAttribute "+name+")",true)
        setCanSave(true)
      } else {
        devLog("DEBUG","updateAttribute (validateAttribute "+name+")",false)
        setCanSave(false)
      }

    }
    
    
  }
  
  return (
    <Grid container >
      {configurations
        .filter((configuration) => configuration.type === attributeType)
        //.filter((configuration) => configuration.environment===undefined||configuration.environment==environment )
        .filter((configuration) => (environmentConfiguration.includes(configuration.name)&&configuration.environment===environment)||(!environmentConfiguration.includes(configuration.name)&&configuration.environment===undefined))
        .filter((configuration) => (specialConfiguration.includes(configuration.name)&&configuration.oid===oid)||(!specialConfiguration.includes(configuration.name)&&!configuration.oid))
        .map((configuration) => {
          const id = `attribuutti.${configuration.name}`;
          const label = id in intl.messages ? { id } : undefined;
          return {
            ...configuration,
            label: label && intl.formatMessage(label),
          };
        })
        .filter(({ name }) => name)
        /*
        .sort(
          (a, b) =>
            2 *
              (attributePreferredOrder.indexOf(b.name!) -
                attributePreferredOrder.indexOf(a.name!)) -
            (b.label ?? b.name!).localeCompare(a.label ?? a.name!)
        )
        */
        .filter((configuration) => configuration.integrationType.filter(it=>it.name===type&&it.visible).length>0)
        .map((configuration) => {
                if(attributeConfiguration.current.find(a => a.name&&a.name === configuration.name) === undefined) {
                  attributeConfiguration.current.push(configuration)
                }
                if(allAttributes.find(name => name === configuration.name) === undefined) {
                  allAttributes.push(configuration.name);
                }
                
                const validator = (value:string) => {
                  if(configuration.mandatory) {
                    return validate(configuration.validation,value);
                  } else {
                    if(value!=='') {
                      return validate(configuration.validation,value);;
                    } else {
                      return true  
                    }
                    
                  }
                  
                }
                const helpGeneratorText = (value:string) => {
                  if(configuration.mandatory) {
                    return helperText(configuration.validation,value);
                  } else {
                    if(value!=='') {
                      return helperText(configuration.validation,value);
                    } else {
                      return (<></>)  
                    }
                    
                  }
                  
                }
                const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===type) || defaultIntegrationType;
                devLog("DEBUG","Metadata (roleConfiguration)",roleConfiguration) 
                
                var useAttribute:Components.Schemas.Attribute ={}
                var attributeExists:boolean=false

                
                devLog("DEBUG","Attributes (init attribute)",configuration.name);                    
                if(!initAttributes.includes(configuration.name)) {
                  if(attributes.find(a => a.name&&a.name === configuration.name)) {
                    //attiribute already exists
                    attributeExists=true
                    useAttribute=attributes.find(a => a.name&&a.name === configuration.name)||{ type: attributeType, content: '', name: 'configurationError' }                    
                    devLog("DEBUG","Attributes (init using existing attribute)",useAttribute);
                  } else {
                    //attiribute not exists
                    
                    const testConfigurationEntity:any = clone(newConfigurationEntityData) 
                    
                    if(configuration?.name&&testConfigurationEntity?.idp?.[configuration.name]) {
                      useAttribute={ type: attributeType, content: String(testConfigurationEntity.idp[configuration.name]), name: configuration.name }
                      devLog("DEBUG","Attributes (init using configurationEntity.idp)",useAttribute);
                    }
                    
                    if(configuration?.name&&testConfigurationEntity?.sp?.[configuration.name]) {
                      useAttribute={ type: attributeType, content: String(testConfigurationEntity.sp[configuration.name]), name: configuration.name }
                      devLog("DEBUG","Attributes (init using configurationEntity.sp)",useAttribute);
                    }
                    
                    if(useAttribute.content === undefined) {
                      devLog("DEBUG","Attributes (init empty content)",configuration.name)
                      if(configuration.name) {
                        if(roleConfiguration.defaultValue) {
                          useAttribute={ type: attributeType, content: String(roleConfiguration.defaultValue), name: configuration.name }
                        } else {
                          if(configuration.enum&&configuration.enum.length>0) {
                            
                            if(configuration.enum&&configuration.enum.length>0&&!configuration.switch) {
                              useAttribute={ type: attributeType, content: String(configuration.enum[0]), name: configuration.name }                          
                            } else {
                              useAttribute={ type: attributeType, content: "false", name: configuration.name }                          
                            }
                          } else {
                            useAttribute={ type: attributeType, content: '', name: configuration.name }
                          }
                          
                        }
                        attributes.push(useAttribute)                      
                        setAttributes(attributes) 
                        
                      } 
                      
                    }
                  }
                  devLog("DEBUG","Attributes (initialized attribute)",useAttribute)                          
                
                  devLog("DEBUG","Attributes (initialized attributes)",initAttributes)
        
                  if(!attributeExists&&configuration.array===false&&configuration.switch&&(useAttribute.content===undefined||useAttribute.content==='')) {
                    //Initialize switch value        
                    devLog("DEBUG","Attributes (init switch content)",configuration.name)            
                    const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===type) || defaultIntegrationType;
                    if(roleConfiguration.defaultValue !== undefined) {
                      updateAttribute(configuration.name,String(roleConfiguration.defaultValue),type)                          
                    } else {
                      if(configuration.enum&&configuration.enum.length>0) {
                        updateAttribute(configuration.name,String(configuration.enum[0]),type)                          
                      } else {
                        updateAttribute(configuration.name,"false",type)                          
                      }
                      
                    }

                    if(!attributeExists&&configuration.array!==false&&configuration.enum&&configuration.enum.length>0&&!configuration.switch&&(useAttribute.content===undefined||useAttribute.content==='')) {
                      //Initialize multiselect value        
                      devLog("DEBUG","Attributes (init multiselect content)",configuration.name)            
                      const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===type) || defaultIntegrationType;
                      if(roleConfiguration.defaultValue !== undefined) {
                        updateAttribute(configuration.name,String(roleConfiguration.defaultValue),type)                          
                      } else {
                        updateAttribute(configuration.name,String(configuration.enum[0]),type)                          
                      }
                      
                    }
  
                    //Initialize attributes
                    if(useAttribute.content&&newConfigurationEntityData?.attributes&&newConfigurationEntityData.attributes.map(a=>a.name).indexOf(configuration.name)<0){                    
                      updateAttribute(configuration.name,String(useAttribute.content),type)
                    }
                    addInitAttributes(useAttribute)
                  }
                  
                }
                
                
                      
                if(validateAttributes()) {
                  devLog("DEBUG","Attributes (validateAttribute "+configuration.name+")",true)
                  setCanSave(true)
                } else {
                  devLog("DEBUG","Attributes (validateAttribute "+configuration.name+")",false)
                  setCanSave(false)
                } 
                            
                devLog("DEBUG","Attributes (useAttribute post)",useAttribute)
                devLog("DEBUG","Attributes (attribute post)",attributes)                  

                return (<AttributeForm 
                  key={configuration.name!}
                  onUpdate={updateAttribute}
                  onValidate={validator}
                  newConfigurationEntityData={newConfigurationEntityData}
                  uiConfiguration={configuration}
                  attribute={useAttribute}
                  attributeType={attributeType!}
                  type={type}
                  role={role}
                  helperText={helpGeneratorText} 
                  setCanSave={function (value: boolean): void {} }                    
                  />)
              }
          
            )
        }
    </Grid>
  );
}
