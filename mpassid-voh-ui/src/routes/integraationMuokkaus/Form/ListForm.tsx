import Clear from "@mui/icons-material/Clear";
import RestoreIcon from '@mui/icons-material/Restore';
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ClearIcon from '@mui/icons-material/Clear';

const SEARCH_PARAM_NANE = "hae";

interface Props {
  object?: any;
  type: string;
  isEditable?: boolean;
  helperText?: JSX.Element;
  onUpdate: (data: any) => void;
  onValidate: (data: any) => boolean;
}

export default function ListForm({ object, type, isEditable=false, helperText=<></>, onValidate, onUpdate }: Props) {
  const intl = useIntl();
  const defaultValue = object;
  const [isEdit, setEdit] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!defaultValue);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLFormElement>(null);
  
  const updateFormState = useCallback(
    function updateFormState() {
      if(inputRef.current) {
        setIsEmpty(!inputRef.current!.value);
        setIsDirty(inputRef.current!.value !== (defaultValue ?? ""));
      }
      
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
          if(onValidate(inputRef.current?.value)&&isDirty) {
            setIsValid(true)
            if(inputRef.current&&defaultValue.indexOf(inputRef.current.value)===-1) {
              onUpdate(inputRef.current.value);
              inputRef.current!.value = "";
              setUsedHelperText(<></>)
            } else {

              setUsedHelperText(<FormattedMessage defaultMessage="Tämä {type} on jo olemassa" values={{type: type}} />)
              setIsValid(false)  
            }
            
          } else {
            setUsedHelperText(helperText)
            setIsValid(false)  
          }
          
           
        }}
        onChange={updateFormState}
      >
        
        <List >
          {object.map((value: any,index: number) => (
            <ListItem
              key={value}
              disableGutters
              secondaryAction={
                <IconButton 
                  aria-label="comment"
                  value={value}
                  onClick={(e)=>{onUpdate(e.currentTarget.value); setUsedHelperText(<></>)}}>
                  <ClearIcon />
                </IconButton>
              }
            >
              <ListItemText primary={value} />
            </ListItem>
          ))}
        </List>
        
        <TextField
          sx={{ width: '80%'}}
          variant="standard"
          placeholder={intl.formatMessage({
            defaultMessage: "Lisää uusi {type}"},
            { type: type} 
          )}
          name={type}
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
    return(<List >
      {object.map((value: any,index: number) => (
        <ListItem
          key={value}
          disableGutters
        >
          <ListItemText primary={value} />
        </ListItem>
      ))}
    </List>)
  }
}

