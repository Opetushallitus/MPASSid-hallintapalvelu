import Clear from "@mui/icons-material/Clear";
import RestoreIcon from '@mui/icons-material/Restore';
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { Dispatch, useCallback, useEffect, useRef, useState } from "react";
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
  label: string;
  type: string;
  isEditable?: boolean;
  mandatory: boolean;
  attributeType: String;
  helperText: (data: string) => JSX.Element;
  onUpdate: (name: string, data: any) => void;
  onValidate: (data: any) => boolean;
  setCanSave: Dispatch<boolean>;
}

export default function ListForm({ object, type, isEditable=false, mandatory=false, label, attributeType, setCanSave,  helperText, onValidate, onUpdate }: Props) {
  const intl = useIntl();
  const defaultValue = object;
  const [isEmpty, setIsEmpty] = useState(!defaultValue);
  const [isDirty, setIsDirty] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const inputRef = useRef<HTMLFormElement>(null);

  const updateFormState = useCallback(
    function updateFormState() {
      if(inputRef.current) {
        //setIsEmpty(!inputRef.current!.value);
        setIsDirty(inputRef.current!.value !== (defaultValue ?? ""));
      }
      
    },
    [defaultValue]
  );

  useEffect(() => {

    if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
      if(isEmpty) {
        setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
        setIsValid(false)      
        setCanSave(false)
      } else {
        setUsedHelperText(<></>)
      }
    }
    
  }, [ label, mandatory, setUsedHelperText, setIsValid, setCanSave, isEmpty ]);

  useEffect(() => {
    updateFormState();
  }, [updateFormState]);

  const updateFormValue = () => {

    if(onValidate(inputRef.current?.value)) {
      setIsValid(true)
      if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
        setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
        setIsValid(false)
        setCanSave(false)  
        onUpdate(type,"");
      } else {
        setCanSave(true) 
        if(inputRef.current?.value) {
          onUpdate(type,inputRef.current.value);
          inputRef.current.value=''  
        } else {
          onUpdate(type,"");
        }
        setUsedHelperText(<></>)
        
      }
      
    } else {
      setUsedHelperText(helperText(inputRef.current?.value))
      setIsValid(false)  
      setCanSave(false)
      //onUpdate(type,"");
    }
  };

  const deleteFormValue = (data:string) => {
      
        setCanSave(true) 
        if(data) {
          onUpdate(type,data);  
        } else {
          onUpdate(type,"");
        }
      
      
  };

  if(isEditable) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if(onValidate(inputRef.current?.value)&&isDirty) {
            setIsValid(true)
            if(inputRef.current&&defaultValue.indexOf(inputRef.current.value)===-1) {
              onUpdate(type,inputRef.current.value);
              inputRef.current!.value = "";
              setUsedHelperText(<></>)
            } else {

              setUsedHelperText(<FormattedMessage defaultMessage="Tämä {type} on jo olemassa" values={{type: type}} />)
              setIsValid(false)  
            }
            
          } else {
            setUsedHelperText(helperText(''))
            setIsValid(false)  
          }
          
           
        }}
        onChange={updateFormState}
      >
        
        <List >
          {object.content.map((value: any,index: number) => (
            <ListItem
              key={index}
              disableGutters
              secondaryAction={
                <IconButton 
                  aria-label={intl.formatMessage({
                    defaultMessage: "kommentti",
                  })}
                  value={value}
                  onClick={(e)=>{deleteFormValue(value); setUsedHelperText(<></>)}}>
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
          onKeyDown={(ev) => {
            console.log(`Pressed keyCode ${ev.key}`);
            if (ev.key === 'Enter') {
              updateFormValue()
            }
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

