
import { devLog } from "@/utils/devLog";
import { Box, Switch } from "@mui/material";
import type { Dispatch, MutableRefObject} from "react";
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
      devLog("SwitchForm (object)",object)
      devLog("SwitchForm (resetValue)",resetValue)    
      if(resetValue) {
        setValue((object.content!==undefined)?JSON.parse(object.content):false)
        devLog("SwitchForm (value)",(object.content!==undefined)?JSON.parse(object.content):false)        
      }  
  }, [object, resetValue, setValue]);


  const updateFormValue = (event: any) => {
    
        devLog("SwitchForm (event.target.checked)",event.target.checked)   
        setCanSave(true) 
        onUpdate(type,event.target.checked,attributeType);
        setValue(JSON.parse(event.target.checked))
      
  };
  devLog("SwitchForm (value for "+object.name+")",object)
  devLog("SwitchForm (value for "+object.name+")",value)
  if(isEditable) {
    return (
        <Switch checked={value}
                onChange={e=>updateFormValue(e)} />
    );

  } else {
    
    return( <Box
      sx={(theme) => ({
        ...theme.typography.body1
        
      })}
    >{value}</Box>)
  }
  
}
