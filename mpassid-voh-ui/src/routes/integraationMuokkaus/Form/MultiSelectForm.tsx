
import type { SelectChangeEvent } from "@mui/material";
import { Box, Checkbox, Chip, FormControl, FormHelperText, Input, ListItemText, MenuItem, Select } from "@mui/material";
import type { Dispatch, JSX } from "react";
import { useEffect, useState } from "react";
import { useIntl } from 'react-intl';
import type { Components } from '@/api';
import { createLogger } from "@/utils/devLog";

const debugLog = createLogger("DEBUG");

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  // MUI v9 moved Select/Menu's PaperProps under slotProps.paper.
  slotProps: {
    paper: {
      style: {
        maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
        width: 250,
      },
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

export default function MultiSelectForm({ values, isEditable=false, mandatory=false, multiple=true, createEmpty=true, helperText, onUpdate, setCanSave,enums }: Props) {
  const intl = useIntl();
  const [selection, setSelection] = useState<string[]>(values);

  // New values from the parent replace the selection; empty values (cleared
  // by the parent) clear it too. Adjusted while rendering, not in an effect.
  const [prevValues, setPrevValues] = useState(values);
  if(values!==prevValues) {
    setPrevValues(values);
    setSelection(values);
  }

  const handleChange = (event: SelectChangeEvent<typeof selection>) => {
    
    debugLog("MultiSelectForm (handleChange event)",event )
    const {
      target: { value },
    } = event;
    
    debugLog("MultiSelectForm (handleChange value)",value )
    

    
    if(value===null||value==='null') {
      setSelection(['null']);
      onUpdate(['null']);
    } else {
      // On autofill we get a stringified value; a single-select value is
      // never a list, so it may contain commas.
      const selected = typeof value === 'string' ? (multiple ? value.split(',') : [value]) : value;
      setSelection(selected);
      onUpdate(selected);
    }
    
  };


  useEffect(() => {
    debugLog("MultiSelectForm (mandatory)",values)
    if(values.length===0&&mandatory) {
      setCanSave(false)  
    }
    
  }, [ mandatory, values, setCanSave ]);
  
  if(isEditable&&(createEmpty||selection.length>0)) {
    return (
     
        <div>
            <FormControl sx={{ width: '80%' }}>
                <Select
                labelId="multiselectForm"
                id="multiselectForm-checkbox"
                multiple={multiple}
                multiline
                error={mandatory}
                value={selection}
                onChange={handleChange}
                input={<Input id="select-multiple-chip"  />}
                renderValue={() => {
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
                    // A placeholder, not a value: selecting it added undefined to the selection.
                    <MenuItem key='none' disabled>
                    <ListItemText primary={<span >{intl.formatMessage({
                    defaultMessage: "Ei valintoja",
                  })}</span>} />
                    </MenuItem>
                )}
                </Select>
                
            </FormControl>
            <FormHelperText error={mandatory}>{helperText(selection.toString())}</FormHelperText>
            </div>
     
    );
  } else {    
    return( <Box
      sx={(theme) => ({
        ...theme.typography.body1
        
      })}
    >{values}</Box>)
  }
  
}
