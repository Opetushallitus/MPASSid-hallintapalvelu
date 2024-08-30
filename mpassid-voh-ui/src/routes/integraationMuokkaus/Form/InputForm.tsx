
import { Box, TextField } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from "lodash";

interface Props {
  object: any;
  type: string;
  label: string;
  attributeType: string;
  isEditable: boolean;
  mandatory: boolean;
  path: any;
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: string,type: string) => void;
  onValidate: (data:string) => boolean;
}

export default function InputForm({ object, type, isEditable=false, mandatory=false, helperText, path, onUpdate, onValidate, attributeType, label,setCanSave }: Props) {
  const intl = useIntl();
  const defaultValue = get(object, path);

  console.log("***** object",object)
  
  const [isValid, setIsValid] = useState(true);
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const inputRef = useRef<HTMLFormElement>(null);

  //console.log("********* InputForm(object): ",object)
  useEffect(() => {
    if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
      setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
      setIsValid(false)      
      setCanSave(false)  
    }
    
  }, [ label, mandatory, setUsedHelperText, setIsValid, setCanSave ]);
  
  const updateFormValue = () => {

    console.log("*************** updateFormValue: ",inputRef.current?.value)

    if(onValidate(inputRef.current?.value)) {
      setIsValid(true)
      if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
        setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
        setIsValid(false)
        setCanSave(false)  
        onUpdate(type,"",attributeType);
      } else {
        console.log("*************** updateFormValue1: ",inputRef.current?.value)
        setCanSave(true) 
        if(inputRef.current?.value) {
          onUpdate(type,inputRef.current.value,attributeType);  
        } else {
          onUpdate(type,"",attributeType);
        }
        setUsedHelperText(<></>)
      }
      
    } else {
      setUsedHelperText(helperText(inputRef.current?.value))
      setIsValid(false)  
      setCanSave(false)
      onUpdate(type,"",attributeType);
    }
  };
  
  if(isEditable) {
    return (
     
        <TextField
          sx={{ width: '80%'}}
          variant="standard"
          placeholder={intl.formatMessage({
            defaultMessage: "Lisää {label}"},
            { label: label} 
          )}
          defaultValue={defaultValue}
          fullWidth
          error={!isValid}
          helperText={usedHelperText}
          inputProps={{
            ref: inputRef,
            autoComplete: "off",
          }}
          onChange={updateFormValue}
        />
     
    );
  } else {
    
    return( <Box
      sx={(theme) => ({
        ...theme.typography.body1
        
      })}
    >{defaultValue}</Box>)
  }
  
}
