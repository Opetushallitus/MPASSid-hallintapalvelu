
import { Box, TextField } from "@mui/material";
import type { Dispatch, JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from "lodash";
import { createLogger } from "@/utils/devLog";

const debugLog = createLogger("DEBUG");

interface Props {
  object: any;
  type: string;
  label: string;
  attributeType: string;
  isEditable: boolean;
  mandatory: boolean;
  path: any;
  reload?: boolean;
  noErros?: boolean;
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: string,type: string) => void;
  onValidate: (data:string) => boolean;
}

export default function InputForm({ object, type, isEditable=false, mandatory=false, helperText, path, onUpdate, onValidate, attributeType, label,setCanSave, reload=false, noErros=false }: Props) {
  const intl = useIntl();
  const defaultValue = get(object, path);
  
  const [isValid, setIsValid] = useState(true);
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const inputRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
      if(inputRef.current) {
        if(object.content) {
          inputRef.current.value=object.content
        } else {
          if(defaultValue) {
            inputRef.current.value=defaultValue
          } else {
            inputRef.current.value=''
          }
        }        
      }
  }, [defaultValue, reload, object]);
  
  useEffect(() => {
    if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
      setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
      setIsValid(false)      
      setCanSave(false)  
    }
    if(!mandatory) {
      setIsValid(onValidate(inputRef.current?.value))
      setCanSave(true) 
      /*
        if(inputRef.current?.value) {
          onUpdate(type,inputRef.current.value,attributeType);  
        } else {
          onUpdate(type,"",attributeType);
        }
          */
        setUsedHelperText(helperText(inputRef.current?.value))
    }
    
  }, [attributeType, helperText, label, mandatory, onUpdate, onValidate, reload, setCanSave, type]);  

  const updateFormValue = () => {
    debugLog("updateFormValue (value)",inputRef.current?.value)
    const valueIsValid = onValidate(inputRef.current?.value)
    debugLog("updateFormValue (onValidate )",valueIsValid)
    if(valueIsValid) {
      
      setIsValid(true)
      debugLog("updateFormValue (mandatory)",mandatory)
      if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
        setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
        setIsValid(false)
        setCanSave(false)  
        onUpdate(type,"",attributeType);
      } else {
        setCanSave(true) 
        if(inputRef.current?.value) {
          onUpdate(type,inputRef.current.value,attributeType);  
        } else {
          onUpdate(type,"",attributeType);
        }
        setUsedHelperText(helperText(inputRef.current?.value))
      }
      
    } else {
      setUsedHelperText(helperText(inputRef.current?.value))
      setIsValid(false)  
      setCanSave(false)
      onUpdate(type,inputRef.current?.value,attributeType);
    }
  };
  
  if(isEditable) {
    return (
     
        <TextField
          key={label}
          sx={{ width: '80%'}}
          variant="standard"
          placeholder={intl.formatMessage({
            defaultMessage: "Lisää {label}"},
            { label: label}
          )}
          defaultValue={defaultValue}
          fullWidth
          error={!isValid&&!noErros}
          helperText={usedHelperText}
          inputRef={inputRef}
          slotProps={{
            htmlInput: {
              autoComplete: "off",
            },
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
