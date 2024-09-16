
import { devLog } from "@/utils/devLog";
import { Box, Switch } from "@mui/material";
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
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: string,type: string) => void;
  onValidate: (data:string) => boolean;
}

export default function SwitchForm({ object, type, isEditable=false, mandatory=false, values=[], helperText, path, onUpdate, onValidate, attributeType, label,setCanSave }: Props) {

  const [value, setValue] = useState<boolean>((object?.content)?!!object.content:false);


  useEffect(() => {
      devLog("SwitchForm (object)",object?.content)      
      setValue((object?.content)?!!object.content:false)
  }, [object,setValue]);


  const updateFormValue = (event: any) => {
    
        setCanSave(true) 
        onUpdate(type,event.target.checked,attributeType);
        setValue(!!event.target.checked)
      
  };
  
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
