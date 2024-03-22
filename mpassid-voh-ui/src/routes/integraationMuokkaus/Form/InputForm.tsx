import { DataRow } from '@/routes/integraatio/IntegrationTab/DataRow';
import { Box, TextField } from "@mui/material";
import { cloneElement, useCallback, useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import { get, last, toPath } from "lodash";

interface Props {
  object: any;
  type: string;
  isEditable: boolean;
  path: any;
  helperText?: JSX.Element;
  onUpdate: (data: string,type: string) => void;
  onValidate: (data: any) => boolean;
}

export default function InputForm({ object, type, isEditable=false, helperText=<></>, path, onUpdate, onValidate }: Props) {
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
    [defaultValue]
  );

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
            console.log("inputRef.current?.value", inputRef.current?.value)
            if(inputRef.current?.value&&inputRef.current.value!=="") {
              onUpdate(inputRef.current.value,type);
              inputRef.current!.value = "";
              setUsedHelperText(<></>)
            } else {

              setUsedHelperText(<FormattedMessage defaultMessage="{type} on pakollinen kenttä" values={{type: type}} />)
              setIsValid(false)  
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
            defaultMessage: "Lisää {type}"},
            { type: type} 
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
