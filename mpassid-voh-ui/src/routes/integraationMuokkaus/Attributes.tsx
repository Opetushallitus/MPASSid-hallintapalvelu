import type { Components } from "@/api";
import type { IntegrationType } from "@/config";
import { attributePreferredOrder, defaultIntegrationType } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from 'react-intl';
import { useEffect, type Dispatch} from "react";
import AttributeForm from "./Form";
import { dataConfiguration } from '../../config';
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
  setAttributes: Dispatch<Components.Schemas.Attribute[]>;
  setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
  setCanSave: Dispatch<boolean>;
}

export default function Attributes({ attributes, role, type, attributeType, newConfigurationEntityData, setNewConfigurationEntityData,oid,environment, setCanSave, setAttributes }: Props) {
  const intl = useIntl();
  const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const mandatoryAttributes:string[] = [];

  const validateAttributes = () => {
    var result=true;
    mandatoryAttributes.forEach(ma=>{
      
      devLog("validateAttribute (mandatoryAttribute)",ma)
      devLog("validateAttribute (mandatoryAttribute "+ma+")",attributes.find(a=>a.name===ma))
      if(mandatoryAttributes.filter(ma=>attributes.filter(a=>(a.content===''||a.content===undefined)).map(a=>a.name).indexOf(ma)>=0).length>0) {
        result=false
      }
    })
    return result
  }
  
  const updateAttribute = (name:string, value:string, type:string ) => {  
    devLog("Attributes (updateAttribute)",name) 
    var attributeList=cloneDeep(attributes);
    if(attributeList.map(a=>a.name).indexOf(name)>-1) {
      attributeList.forEach(attribute=>{
        if(attribute.name===name) {
          attribute.content=value;
        }
      })
    } else {
      if(type==='data'||type==='user') {
        attributeList.push({type: type, name: name,content: value }) 
      }
      
    }
    if(type==='user') {
      attributeList=attributes.filter(a=>a.content!=='')
    }
    
    setAttributes(attributeList)
    
    devLog("updateAttribute (validateAttributes)",validateAttributes())
    if(validateAttributes()) {
      setCanSave(true)
    } else {
      setCanSave(false)
    }

    
    if(newConfigurationEntityData.attributes !== undefined) {
      const configurationEntity = cloneDeep(newConfigurationEntityData)
      configurationEntity.attributes=cloneDeep(attributeList);
      setNewConfigurationEntityData(configurationEntity)
    }
  }

    return (
      <Grid container >
        {dataConfiguration
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
          .sort(
            (a, b) =>
              2 *
                (attributePreferredOrder.indexOf(b.name!) -
                  attributePreferredOrder.indexOf(a.name!)) -
              (b.label ?? b.name!).localeCompare(a.label ?? a.name!)
          )
          .filter((configuration) => configuration.integrationType.filter(it=>it.name===type&&it.visible).length>0)
          .map((configuration) => {
                  if(configuration.mandatory) {
                    mandatoryAttributes.push(configuration.name);
                  }
                  const validator = (value:string) => {
                    return validate(configuration.validation,value);
                  }
                  const helpGeneratorText = (value:string) => {
                    return helperText(configuration.validation,value);
                  }
                  var useAttribute:Components.Schemas.Attribute ={}
                  var attributeExists:boolean=false

                  
                  devLog("Attributes (init attributes)",attributes);
                  devLog("Attributes (init)",attributes.find(a => a.name&&a.name === configuration.name));                  
                  if(attributes.find(a => a.name&&a.name === configuration.name)) {
                    //attiribute 
                    attributeExists=true
                    useAttribute=attributes.find(a => a.name&&a.name === configuration.name)||{ type: attributeType, content: '', name: 'configurationError' }
                  } else {
                    const testConfigurationEntity:any = clone(newConfigurationEntityData) 
                    
                    if(configuration?.name&&testConfigurationEntity?.idp?.[configuration.name]) {
                      useAttribute={ type: attributeType, content: testConfigurationEntity.idp[configuration.name], name: configuration.name }
                    }
                    
                    if(configuration?.name&&testConfigurationEntity?.sp?.[configuration.name]) {
                      useAttribute={ type: attributeType, content: testConfigurationEntity.sp[configuration.name], name: configuration.name }
                    }
                    
                    if(useAttribute.content === undefined) {
                      devLog("Attributes (init empty content)",configuration.name)
                      if(configuration.name) {
                        useAttribute={ type: attributeType, content: '', name: configuration.name }
                      } else {
                        useAttribute={ type: attributeType, content: '', name: 'configurationError' }
                      }
                      
                    }
                  }
                  devLog("Attributes (initialized attribute)",useAttribute)
                  devLog("Attributes (init switch condition 1)",!attributeExists)
                  devLog("Attributes (init switch condition 2)",configuration.multivalue===false)
                  devLog("Attributes (init switch condition 3)",configuration.enum !== undefined)
                  //devLog("Attributes (init switch condition 4)",configuration.enum.length===2||true)
                  devLog("Attributes (init switch condition 5)",(useAttribute.content===undefined||useAttribute.content===''))
                  if(!attributeExists&&configuration.multivalue===false&&configuration.enum&&configuration.enum.length===2&&(useAttribute.content===undefined||useAttribute.content==='')) {
                    //Initialize switch value        
                    devLog("Attributes (init switch content)",configuration.name)            
                    const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===type) || defaultIntegrationType;
                    if(roleConfiguration.defaultValue !== undefined) {
                      useAttribute={ type: attributeType, content: roleConfiguration.defaultValue, name: configuration.name }
                      attributes.push(useAttribute)
                      setAttributes([ ...attributes])
                      updateAttribute(configuration.name,String(roleConfiguration.defaultValue),type)                          
                    } else {
                      useAttribute={ type: attributeType, content: configuration.enum[0], name: configuration.name }
                      attributes.push(useAttribute)
                      setAttributes([ ...attributes])
                      updateAttribute(configuration.name,String(configuration.enum[0]),type)                          
                    }
                    
                  }

                  //Initialize attributes
                  if(useAttribute.content&&newConfigurationEntityData?.attributes&&newConfigurationEntityData.attributes.map(a=>a.name).indexOf(configuration.name)<0){
                    updateAttribute(configuration.name,String(useAttribute.content),type)
                  }
                  
                  
                  devLog("Attributes (attribute post)",attributes)
                  devLog("Attributes (attribute post)",useAttribute)

                  return (<AttributeForm 
                    key={configuration.name!}
                    onUpdate={updateAttribute}
                    onValidate={validator}
                    newConfigurationEntityData={newConfigurationEntityData}
                    setNewConfigurationEntityData={setNewConfigurationEntityData}
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
