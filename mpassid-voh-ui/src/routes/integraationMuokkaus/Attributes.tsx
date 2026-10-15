import type { Components } from "@/api";
import type { IntegrationType, UiConfiguration } from "@/config";
import { defaultIntegrationType } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from 'react-intl';
import { useEffect, type Dispatch, type SetStateAction} from "react";
import AttributeForm from "./Form";
import { helperText, validate } from "@/utils/Validators";
import { createLogger, redactSecrets } from "@/utils/devLog";
import { clone, cloneDeep } from "lodash";

const debugLog = createLogger("DEBUG");

interface Props {
  role?: string;
  oid: string;
  environment: number;
  attributes: Components.Schemas.Attribute[];
  attributeType: Components.Schemas.Attribute["type"];
  type: string;
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
  // The configurations shown for this type, environment and oid (sorting is
  // disabled), and validated by name (the first of a name).
  const shownConfigurations = configurations
        .filter((configuration) => configuration.type === attributeType)
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
        .filter((configuration) => configuration.integrationType.filter(it=>it.name===type).length>0)
  const attributeConfiguration = shownConfigurations.filter((configuration, index, all) => all.findIndex(a => a.name&&a.name === configuration.name) === index)
  // The values initialized on this render (defaults, idp/sp fields) for
  // attributes not yet in `attributes`; merged there by the effect below.
  const currentAttributes: Components.Schemas.Attribute[] = [];

  // React 19 no longer tolerates state updates fired during render (calling
  // parent setters like setCanSave/setAttributes/addInitAttributes while
  // rendering caused an infinite parent<->child re-render loop). We queue
  // those writes while rendering and flush them once, after commit, in the
  // effect below. They are all idempotent (guarded by refs / value checks),
  // so the effect settles after the attributes are initialized.
  // A list of this render (not a ref): the effect after its commit runs it.
  const pendingEffects: Array<() => void> = [];


  const validateAttributes = () => {
    let result=true;
    
    attributeConfiguration.forEach(configuration=>{
      if(result) {

        const name=configuration.name
        // Prefer the committed `attributes` state (carries the user's manual
        // edits), but fall back to the locally initialized defaults in
        // `currentAttributes`. The default writes into `attributes`
        // are deferred to an effect (see reconcile effect below), so during
        // the render that first computes them `attributes` is still stale —
        // reading the ref keeps setCanSave correct without waiting a frame.
        const currentAttribute=attributes.find(a=>a.name===name)||currentAttributes.find(a=>a.name===name)

        debugLog("validateAttributes (attributes)",redactSecrets(attributes))
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
        //debugLog("validateAttributes ("+name+")",result)             
      }      
    })
    
    return result
  }

  const updateAttribute = (name:string, value:string, type:string ) => { 
    if(name!==undefined&&value!==undefined&&value!==attributes.find(a=>a.name===name&&a.type===type)?.content) {
      debugLog("updateAttribute ("+name+")",value) 
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
        debugLog("updateAttribute (validateAttribute "+name+")",true)
        setCanSave(true)
      } else {
        debugLog("updateAttribute (validateAttribute "+name+")",false)
        setCanSave(false)
      }

    }
    
    
  }

  // Render-time initialization helpers: queue the parent state write instead
  // of performing it during render (see pendingEffects note above).
  const queueUpdateAttribute = (name: string, value: string, type: string) =>
    pendingEffects.push(() => updateAttribute(name, value, type));
  const queueAddInitAttributes = (attribute: Components.Schemas.Attribute) =>
    pendingEffects.push(() => addInitAttributes(attribute));

  // The fields; rendering them queues the initialization writes, so the
  // effects (below) come after it.
  const fields = shownConfigurations
        .map((configuration) => {
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
                debugLog("Metadata (roleConfiguration for "+configuration.name+")",roleConfiguration) 
                
                let useAttribute:Components.Schemas.Attribute ={}
                let attributeExists:boolean=false

                
                debugLog("Attributes (init attribute)",configuration.name);                                    
                if(!initAttributes.includes(configuration.name)) {
                  if(attributes.find(a => a.name&&a.name === configuration.name)) {
                    //attiribute already exists
                    attributeExists=true
                    useAttribute=attributes.find(a => a.name&&a.name === configuration.name)||{ type: attributeType, content: '', name: 'configurationError' }                    
                    debugLog("Attributes (init using existing attribute)",useAttribute);
                  } else {
                    //attiribute not exists                    
                    // configuration.name names an idp/sp field, read by name.
                    const testConfigurationEntity = clone(newConfigurationEntityData) as {
                      idp?: Record<string, unknown>;
                      sp?: Record<string, unknown>;
                    }
                    
                    //initilize using existing integration values
                    if(configuration?.name&&testConfigurationEntity?.idp?.[configuration.name]) {
                      useAttribute={ type: attributeType, content: String(testConfigurationEntity.idp[configuration.name]), name: configuration.name }
                      debugLog("Attributes (init using configurationEntity.idp)",useAttribute);
                    }
                    
                    if(configuration?.name&&testConfigurationEntity?.sp?.[configuration.name]) {
                      useAttribute={ type: attributeType, content: String(testConfigurationEntity.sp[configuration.name]), name: configuration.name }
                      debugLog("Attributes (init using configurationEntity.sp)",useAttribute);
                    }
                    
                    if(useAttribute.content === undefined) {
                      debugLog("Attributes (init empty content)",configuration.name)
                      if(configuration.name) {
                        if(roleConfiguration.defaultValue) {
                          debugLog("Attributes (init roleConfiguration.defaultValue)",roleConfiguration.defaultValue)
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
                      } 
                      
                    }
                    // Record defaults and values taken from the idp/sp fields alike.
                    if(useAttribute.name!==undefined&&!currentAttributes.map(a=>a.name).includes(useAttribute.name)&&useAttribute.content!=='') {
                      debugLog("Attributes (new init attribute)",useAttribute);
                      // Only record the value locally. The commit into the
                      // shared `attributes` state happens in the reconcile
                      // effect below via a MERGE — never replace the whole
                      // array here, or the sibling <Attributes> instance
                      // (data vs. user) would wipe out each other's defaults.
                      currentAttributes.push(useAttribute);
                    }
                  }
                  debugLog("Attributes (initialized attribute)",useAttribute)                          
                
                  debugLog("Attributes (initialized attributes)",initAttributes)
        
                  if(!attributeExists&&configuration.array===false&&configuration.switch&&(useAttribute.content===undefined||useAttribute.content==='')) {
                    //Initialize switch value        
                    debugLog("Attributes (init switch content)",configuration.name)            
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
                      debugLog("Attributes (init multiselect content)",configuration.name)            
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
                
                
                      
                pendingEffects.push(() => {
                  if(validateAttributes()) {
                    debugLog("Attributes (validateAttribute "+configuration.name+")",true)
                    setCanSave(true)
                  } else {
                    debugLog("Attributes (validateAttribute "+configuration.name+")",false)
                    setCanSave(false)
                  }
                });
                            
                debugLog("Attributes (useAttribute post)",useAttribute)
                debugLog("Attributes (attribute post)",redactSecrets(attributes))                  

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
                    setCanSave={function (_value: boolean): void {} }                    
                    />)
                } else {
                  return(<></>)
                }
                
              }
          
            )

  useEffect(() => {
    pendingEffects.forEach((run) => run());
  });

  // Reconcile the locally initialized defaults into the shared `attributes`
  // state. This MERGES (functional update) rather than replacing, so the two
  // sibling <Attributes> instances (data + user) that share the same
  // setAttributes never clobber each other. It only fires when something is
  // genuinely missing, so it settles after one pass and cannot loop.
  useEffect(() => {
    const missing = currentAttributes.filter(
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

  return (
    <Grid container >
      {fields}
    </Grid>
  );
}
