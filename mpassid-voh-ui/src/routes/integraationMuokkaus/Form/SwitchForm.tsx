
import { devLog } from "@/utils/devLog";
import { Switch } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useState } from "react";

interface Props {
  object: any;
  type: string;
  label: string;
  attributeType: string;
  isEditable: boolean;
  mandatory: boolean;
  path: any;
  values: any[];
  resetValue?: boolean;
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: boolean,type: string) => void;
  onValidate: (data:string) => boolean;
}

export default function SwitchForm({ object, type, isEditable=false, mandatory=false, values=[], helperText, path, onUpdate, onValidate, attributeType, label,setCanSave,resetValue=false }: Props) {

  const [value, setValue] = useState<boolean>((object?.content)?JSON.parse(object.content):false);


  useEffect(() => {
      devLog("DEBUG","SwitchForm (object)",object)
      devLog("DEBUG","SwitchForm (resetValue)",resetValue)    
      if(resetValue) {
        setValue((object.content!==undefined)?JSON.parse(object.content):false)
        devLog("DEBUG","SwitchForm (value)",(object.content!==undefined)?JSON.parse(object.content):false)        
      }  
  }, [object, resetValue, setValue]);


  const updateFormValue = (event: any) => {
    
        devLog("DEBUG","SwitchForm (event.target.checked)",event.target.checked)   
        setCanSave(true) 
        onUpdate(type,event.target.checked,attributeType);
        setValue(JSON.parse(event.target.checked))
      
  };
  devLog("DEBUG","SwitchForm (value for "+object.name+")",object)
  devLog("DEBUG","SwitchForm (value for "+object.name+")",value)
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
