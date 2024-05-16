
import { Box, Checkbox, Chip, FormControl, Input, InputLabel, ListItemText, MenuItem, OutlinedInput, Select, SelectChangeEvent, TextField } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import { get } from "lodash";
import type { Components } from '@/api';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export interface oneEnum {
    label: string;
    value: string;
}
const enumss = [
    { 
        label: 'Ammatilliset erityisoppilaitokset',
        value: '22'
    },
    { 
        label: 'Ammatilliset oppilaitokset',
        value: '21'
    },
    { 
        label: 'Kansalaisopistot',
        value: '64'
    },
    { 
        label: 'Kansanopistot',
        value: '63'
    },
    { 
        label: 'Lukiot',
        value: '15'
    },
    { 
        label: 'Musiikkioppilaitokset',
        value: '61'
    },
    { 
        label: 'Perus- ja lukioasteen koulut',
        value: '19'
    },
    { 
        label: 'Peruskouluasteen erityiskoulut',
        value: '12'
    },
    { 
        label: 'Peruskoulut',
        value: '11'
    }
]
	

interface Props {
  object: any;
  type: string;
  label: string;
  attributeType: Components.Schemas.Attribute["type"];
  isEditable: boolean;
  mandatory: boolean;
  path: any;
  enums: oneEnum[];
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (name: string,value: string,type: Components.Schemas.Attribute["type"]) => void;
  onValidate: (data:string) => boolean;
}

export default function MultiSelectForm({ object, type, isEditable=false, mandatory=false, helperText, path, onUpdate, onValidate, attributeType, label,setCanSave,enums }: Props) {
  const intl = useIntl();
  const defaultValue = get(object, path);
  
  const [isValid, setIsValid] = useState(true);
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const inputRef = useRef<HTMLFormElement>(null);

  const [selection, setSelection] = useState<string[]>([]);

  const handleChange = (event: SelectChangeEvent<typeof selection>) => {
    const {
      target: { value },
    } = event;
    setSelection(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value,
    );
  };


  useEffect(() => {
    if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
      setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
      setIsValid(false)
      setCanSave(false)  
    }
    
  }, [ label, mandatory, setUsedHelperText, setIsValid, setCanSave ]);
  
  const updateFormValue = () => {
    if(onValidate(inputRef.current?.value)) {
      setIsValid(true)
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
     
        <div>
            <FormControl sx={{ m: 1, width: '80%' }}>
                
                <Select
                labelId="multiselectForm"
                id="multiselectForm-checkbox"
                multiple
                multiline
                value={selection}
                onChange={handleChange}
                input={<Input id="select-multiple-chip"  />}
                renderValue={(selected) => {
                    const renderValues=[];
                    enums.filter(e=>selection.indexOf(e.value) > -1).forEach(e=>renderValues.push(e.label))


                    return ( 
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {renderValues.map((value) => (
                            <Chip key={value} label={value} />
                        ))}
                    </Box>)
                    }}
                MenuProps={MenuProps}
                >
                {enums.map((name) => (
                    <MenuItem key={name.value} value={name.value}>
                    <Checkbox checked={selection.indexOf(name.value) > -1} />
                    <ListItemText primary={name.label} />
                    </MenuItem>
                ))}
                </Select>
            </FormControl>
            </div>
     
    );
  } else {
    /*
    <TextList
            value={
            identityProvider.institutionTypes?.length
                ? identityProvider.institutionTypes.map(
                    (institutionType) =>
                    `${getKoodistoValue(
                        institutionTypes,
                        String(institutionType),
                        language
                    )} (${institutionType})`
                )
                : []
            }
        />
    */
    return( <Box
      sx={(theme) => ({
        ...theme.typography.body1
        
      })}
    >{defaultValue}</Box>)
  }
  
}
