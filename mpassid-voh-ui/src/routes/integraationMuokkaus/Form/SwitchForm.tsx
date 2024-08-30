
import { Box, SelectChangeEvent, Switch, TextField } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from "lodash";
import type { Components } from '@/api';

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
  const intl = useIntl();
  const [value, setValue] = useState<any>(object?.content);
  
  //console.log("***** SwitchForm (value): ",object,value)


  const updateFormValue = (event: any) => {
    
        //console.log("*** updateFormValue: ",event.target.checked)
    
        setCanSave(true) 
        onUpdate(type,event.target.checked,attributeType);
        setValue(event.target.checked)
      
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
