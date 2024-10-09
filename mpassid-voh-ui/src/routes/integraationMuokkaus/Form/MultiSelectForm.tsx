
import type { SelectChangeEvent } from "@mui/material";
import { Box, Checkbox, Chip, FormControl, FormHelperText, Input, ListItemText, MenuItem, Select } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import { useIntl, FormattedMessage } from 'react-intl';
import type { Components } from '@/api';
import { devLog } from "@/utils/devLog";

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

interface Props {
  
  label: string;
  attributeType: Components.Schemas.Attribute["type"];
  isEditable: boolean;
  mandatory: boolean;
  enums: oneEnum[];
  values: string[];
  multiple?: boolean;
  createEmpty?: boolean;
  helperText: (data:string) => JSX.Element;
  setCanSave: Dispatch<boolean>;
  onUpdate: (values: string[]) => void;
  onValidate: (data:string) => boolean;
}

export default function MultiSelectForm({ values, isEditable=false, mandatory=false, multiple=true, createEmpty=true, helperText, onUpdate, onValidate, attributeType, label,setCanSave,enums }: Props) {
  const intl = useIntl();

  
  const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
  const inputRef = useRef<HTMLFormElement>(null);

  const [selection, setSelection] = useState<string[]>([]);

  useEffect(() => {
    if(values.length>0) {
      setSelection(values)
    }
    
  },[ values ])

  const handleChange = (event: SelectChangeEvent<typeof selection>) => {
    
    devLog("MultiSelectForm (handleChange event)",event )
    const {
      target: { value },
    } = event;
    
    devLog("MultiSelectForm (handleChange value)",value )
    

    
    if(value===null||value==='null') {
      setSelection(['null']);
      onUpdate(['null']);
    } else {
      setSelection(
        // On autofill we get a stringified value.
        typeof value === 'string' ? value.split(',') : value,
      );
      onUpdate(typeof value === 'string' ? value.split(',') : value);
    }
    
  };


  useEffect(() => {
    if((!inputRef.current?.value||inputRef.current.value==="")&&mandatory) {
      setUsedHelperText(<FormattedMessage defaultMessage="{label} on pakollinen kenttä" values={{label: label}} />)
      setCanSave(false)  
    }
    
  }, [ label, mandatory, setUsedHelperText, setCanSave ]);
  
  if(isEditable&&(createEmpty||selection.length>0)) {
    return (
     
        <div>
            <FormControl sx={{ width: '80%' }}>
                <Select
                labelId="multiselectForm"
                id="multiselectForm-checkbox"
                multiple={multiple}
                multiline
                value={selection}
                onChange={handleChange}
                input={<Input id="select-multiple-chip"  />}
                renderValue={(selected) => {
                    const renderValues:string[]=[];
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
                
                {enums&&enums.filter(e=>e.value!=='').length>0&&enums.map((name,index) => (
                  
                    <MenuItem key={name.value+"_mi"+index} value={name.value}>
                    <Checkbox checked={(selection.indexOf(name.value) > -1)} />
                    <ListItemText primary={name.label} />
                    </MenuItem>
                ))}
                {createEmpty&&enums&&enums.length===0&&(
                    <MenuItem key='none' >
                    <ListItemText primary={<span >{intl.formatMessage({
                    defaultMessage: "Ei valintoja",
                  })}</span>} />
                    </MenuItem>
                )}
                </Select>
                <FormHelperText>{helperText("")}</FormHelperText>
            </FormControl>
            </div>
     
    );
  } else {    
    return( <Box
      sx={(theme) => ({
        ...theme.typography.body1
        
      })}
    >--</Box>)
  }
  
}
