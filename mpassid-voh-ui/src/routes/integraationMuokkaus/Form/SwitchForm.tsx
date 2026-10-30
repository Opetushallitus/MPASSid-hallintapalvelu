
import { createLogger } from "@/utils/devLog";
import { Switch } from "@mui/material";
import type { Dispatch, JSX } from "react";
import { useState, type ChangeEvent } from "react";
import type { FormObject } from "./types";

const debugLog = createLogger("DEBUG");

interface Props {
  object: FormObject;
  type: string;
  label: string;
  attributeType: string;
  isEditable: boolean;
  mandatory: boolean;
  path: string;
  values: string[];
  resetValue?: boolean;
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: boolean,type: string) => void;
  onValidate: (data:string) => boolean;
}

export default function SwitchForm({ object, type, isEditable=false, onUpdate, attributeType, setCanSave,resetValue=false }: Props) {

  const [value, setValue] = useState<boolean>((object?.content)?JSON.parse(String(object.content)):false);


  // With resetValue a new object (or resetValue turning on) resets the value
  // from its content (adjusted while rendering instead of in an effect).
  const [prevObject, setPrevObject] = useState(object);
  const [prevResetValue, setPrevResetValue] = useState(resetValue);
  if(object!==prevObject||resetValue!==prevResetValue) {
      setPrevObject(object);
      setPrevResetValue(resetValue);
      debugLog("SwitchForm (object)",object)
      debugLog("SwitchForm (resetValue)",resetValue)    
      if(resetValue) {
        // Same check as the initial value: a missing or empty content is false.
        setValue((object.content)?JSON.parse(String(object.content)):false)
        debugLog("SwitchForm (value)",(object.content)?JSON.parse(String(object.content)):false)        
      }  
  }


  const updateFormValue = (event: ChangeEvent<HTMLInputElement>) => {
    
        debugLog("SwitchForm (event.target.checked)",event.target.checked)   
        setCanSave(true) 
        onUpdate(type,event.target.checked,attributeType);
        setValue(event.target.checked)
      
  };
  debugLog("SwitchForm (value for "+object.name+")",object)
  debugLog("SwitchForm (value for "+object.name+")",value)
  if(isEditable) {
    return (
        <Switch checked={value}
                onChange={e=>updateFormValue(e)} />
    );

  } else {
    
    return( <Switch sx={{ opacity: 0.4}} checked={value}
       />)
  }
  
}
