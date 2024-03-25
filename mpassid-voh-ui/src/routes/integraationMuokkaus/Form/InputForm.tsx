import { DataRow } from '@/routes/integraatio/IntegrationTab/DataRow';
import { Box, TextField } from "@mui/material";
import { cloneElement, useCallback, useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import { get, last, toPath } from "lodash";
import { Components } from '@/api';

interface Props {
  object: any;
  type: string;
  label: string;
  attributeType: Components.Schemas.Attribute["type"];
  isEditable: boolean;
  mandatory: boolean;
  path: any;
  helperText?: JSX.Element;
  onUpdate: (name: string,value: string,type: Components.Schemas.Attribute["type"]) => void;
  onValidate: (data: any) => boolean;
}

export default function InputForm({ object, type, isEditable=false, mandatory=false, helperText=<></>, path, onUpdate, onValidate, attributeType, label }: Props) {
  const intl = useIntl();
  const defaultValue = get(object, path);
  const [isEmpty, setIsEmpty] = useState(!defaultValue);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLFormElement>(null);

  const updateFormState = useCallback(
    function updateFormState() {
      setIsEmpty(!inputRef.current!);
      setIsDirty(inputRef.current! !== (defaultValue ?? ""));
    },
    [defaultValue]);

  useEffect(() => {
    updateFormState();
  }, [updateFormState]);

  useEffect(() => {
    updateFormState();
  }, [object]);

  if(isEditable) {
    return (
      <form 
        onSubmit={(event) => {
          event.preventDefault();
          if(onValidate(inputRef.current?.value)&&isDirty) {
            setIsValid(true)
            if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
              setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
              setIsValid(false)  
            } else {
              if(inputRef.current?.value) {
                onUpdate(type,inputRef.current.value,attributeType);  
              } else {
                onUpdate(type,"",attributeType);
              }
              setUsedHelperText(<></>)
            }
            
          } else {
            setUsedHelperText(helperText)
            setIsValid(false)  
          }
          //if(onUpdate&&inputRef.current?.value) {
          //  onUpdate(inputRef.current.value,type);
          //}   
        }}
        onChange={updateFormState}
      >
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
          
        />
      </form>
    );
  } else {
    
    return( <Box
      sx={(theme) => ({
        ...theme.typography.body1
        
      })}
    >{defaultValue}</Box>)
  }
  
}
