import { DataRow } from '@/routes/integraatio/IntegrationTab/DataRow';
import { Box, TextField } from "@mui/material";
import { cloneElement, useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { get, last, toPath } from "lodash";

interface Props {
  object: any;
  type: string;
  isEditable: boolean;
  path: any;
  onUpdate?: (data: string,type: string) => void;
}

export default function InputForm({ object, type, isEditable=false, path, onUpdate }: Props) {
  const intl = useIntl();
  const defaultValue = get(object, path);;
  const [isEmpty, setIsEmpty] = useState(!defaultValue);
  const [isDirty, setIsDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLFormElement>(null);

  console.log("*************",object)

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

  if(isEditable) {
    return (
      <form 
        onSubmit={(event) => {
          event.preventDefault();
          if(onUpdate&&inputRef.current?.value) {
            onUpdate(inputRef.current.value,type);
          }   
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
