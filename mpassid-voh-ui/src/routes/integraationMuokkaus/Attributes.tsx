import type { Components } from "@/api";
import type { IntegrationType, UiConfiguration } from "@/config";
import { defaultIntegrationType } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from 'react-intl';
import { useEffect, useRef, type Dispatch, type SetStateAction} from "react";
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
  setAttributes: Dispatch<SetStateAction<Components.Schemas.Attribute[]>>;
  setNewConfigurationEntityData: Dispatch<Components.Schemas.ConfigurationEntity>;
  setCanSave: Dispatch<boolean>;
}

export default function Attributes({ attributes, role, type, attributeType, newConfigurationEntityData, setNewConfigurationEntityData,oid,environment, setCanSave, setAttributes, initAttributes, addInitAttributes, dataConfiguration }: Props) {
  const intl = useIntl();
  const configurations:UiConfiguration[] = dataConfiguration.filter(conf=>conf.integrationType.filter(i=>i.name===type).length>0)
  const specialConfiguration:string[] = configurations.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
  const environmentConfiguration:string[] = configurations.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
  const attributeConfiguration=useRef<UiConfiguration[]>([]);
  const currentAttributes=useRef<Components.Schemas.Attribute[]>([]);

  // React 19 no longer tolerates state updates fired during render (calling
  // parent setters like setCanSave/setAttributes/addInitAttributes while
  // rendering caused an infinite parent<->child re-render loop). We queue
  // those writes while rendering and flush them once, after commit, in the
  // effect below. They are all idempotent (guarded by refs / value checks),
  // so the effect settles after the attributes are initialized.
  const pendingEffects = useRef<Array<() => void>>([]);
  pendingEffects.current = [];


  const validateAttributes = () => {
    var result=true;
    
    attributeConfiguration.current.forEach(configuration=>{
      if(result) {

        const name=configuration.name
        // Prefer the committed `attributes` state (carries the user's manual
        // edits), but fall back to the locally initialized defaults in
        // `currentAttributes.current`. The default writes into `attributes`
        // are deferred to an effect (see reconcile effect below), so during
        // the render that first computes them `attributes` is still stale —
        // reading the ref keeps setCanSave correct without waiting a frame.
        var currentAttribute=attributes.find(a=>a.name===name)||currentAttributes.current.find(a=>a.name===name)

        devLog("DEBUG","validateAttributes (attributes)",attributes)
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

  useEffect(() => {
    const effects = pendingEffects.current;
    effects.forEach((run) => run());
  });

  // Reconcile the locally initialized defaults into the shared `attributes`
  // state. This MERGES (functional update) rather than replacing, so the two
  // sibling <Attributes> instances (data + user) that share the same
  // setAttributes never clobber each other. It only fires when something is
  // genuinely missing, so it settles after one pass and cannot loop.
  useEffect(() => {
    const missing = currentAttributes.current.filter(
      (ca) => ca.name && !attributes.some((a) => a.name === ca.name)
    );
    if (missing.length > 0) {
      setAttributes((prev) => {
        const merged = cloneDeep(prev);
        missing.forEach((m) => {
          if (!merged.some((a) => a.name === m.name)) {
            merged.push(cloneDeep(m));
          }
        });
        return merged;
      });
    }
  });

  // Render-time initialization helpers: queue the parent state write instead
  // of performing it during render (see pendingEffects note above).
  const queueUpdateAttribute = (name: string, value: string, type: string) =>
    pendingEffects.current.push(() => updateAttribute(name, value, type));
  const queueAddInitAttributes = (attribute: Components.Schemas.Attribute) =>
    pendingEffects.current.push(() => addInitAttributes(attribute));

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
        .filter((configuration) => configuration.integrationType.filter(it=>it.name===type).length>0)
        .map((configuration) => {
                if(attributeConfiguration.current.find(a => a.name&&a.name === configuration.name) === undefined) {
                  attributeConfiguration.current.push(configuration)
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
                devLog("DEBUG","Metadata (roleConfiguration for "+configuration.name+")",roleConfiguration) 
                
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
                    
                    //initilize using existing integration values
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
                          devLog("DEBUG","Attributes (init roleConfiguration.defaultValue)",roleConfiguration.defaultValue)
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
                        //attributes.push(useAttribute)                      
                        //setAttributes(attributes) 
                        //const attributeList=cloneDeep(attributes);
                        //attributeList.push(useAttribute)    
                        //setAttributes(attributeList)   
                        if(useAttribute.name!==undefined&&!currentAttributes.current.map(a=>a.name).includes(useAttribute.name)&&useAttribute.content!=='') {
                          devLog("DEBUG","Attributes (new init attribute)",useAttribute);
                          // Only record the default locally. The commit into the
                          // shared `attributes` state happens in the reconcile
                          // effect below via a MERGE — never replace the whole
                          // array here, or the sibling <Attributes> instance
                          // (data vs. user) would wipe out each other's defaults.
                          currentAttributes.current.push(useAttribute);
                        }
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
                      queueUpdateAttribute(configuration.name,String(roleConfiguration.defaultValue),type)                          
                    } else {
                      if(configuration.enum&&configuration.enum.length>0) {
                        queueUpdateAttribute(configuration.name,String(configuration.enum[0]),type)                          
                      } else {
                        queueUpdateAttribute(configuration.name,"false",type)                          
                      }
                      
                    }

                    if(!attributeExists&&configuration.array!==false&&configuration.enum&&configuration.enum.length>0&&!configuration.switch&&(useAttribute.content===undefined||useAttribute.content==='')) {
                      //Initialize multiselect value        
                      devLog("DEBUG","Attributes (init multiselect content)",configuration.name)            
                      const roleConfiguration:IntegrationType=configuration.integrationType.find(c=>c.name===type) || defaultIntegrationType;
                      if(roleConfiguration.defaultValue !== undefined) {
                        queueUpdateAttribute(configuration.name,String(roleConfiguration.defaultValue),type)                          
                      } else {
                        queueUpdateAttribute(configuration.name,String(configuration.enum[0]),type)                          
                      }
                      
                    }
  
                    //Initialize attributes
                    if(useAttribute.content&&newConfigurationEntityData?.attributes&&newConfigurationEntityData.attributes.map(a=>a.name).indexOf(configuration.name)<0){                    
                      queueUpdateAttribute(configuration.name,String(useAttribute.content),type)
                    }
                    queueAddInitAttributes(useAttribute)
                  }
                  
                }
                
                
                      
                pendingEffects.current.push(() => {
                  if(validateAttributes()) {
                    devLog("DEBUG","Attributes (validateAttribute "+configuration.name+")",true)
                    setCanSave(true)
                  } else {
                    devLog("DEBUG","Attributes (validateAttribute "+configuration.name+")",false)
                    setCanSave(false)
                  }
                });
                            
                devLog("DEBUG","Attributes (useAttribute post)",useAttribute)
                devLog("DEBUG","Attributes (attribute post)",attributes)                  

                const visible = (configuration.integrationType.filter(it=>it.visible).length>0)?true:false;
                if(visible&&configuration.name!==undefined) {
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
                } else {
                  return(<></>)
                }
                
              }
          
            )
        }
    </Grid>
  );
}
