import { useIntegrationsSpecSearchPageable } from "@/api/client";
import MenuItem from "@mui/material/MenuItem";
import type { Components } from "@/api";
import type { SelectChangeEvent } from "@mui/material/Select";
import Select from "@mui/material/Select";
import { devLog } from "@/utils/devLog";
import { useState } from "react";
import { FormattedMessage } from 'react-intl';

interface Props {
    oid:string;
    handleService: (value: serviceProps) => void
  }

interface serviceProps {
    name:string;
    environment:number;   
    setId:number;
}  
  
function PossibleServices({oid,handleService}: Props) {

    const [serviceIndex, setServiceIndex] = useState(-3);

    const handleServiceView = (event: SelectChangeEvent) => {
        
        devLog('handleServiceView',event.target.value)
        if(Number(event.target.value)===-2) {
            handleService({environment: 0, name: 'uusi', setId: 0})
            setServiceIndex(Number(event.target.value))
        }
        if(Number(event.target.value)===-1) {
            handleService({environment: 1, name: 'uusi', setId: 0})
            setServiceIndex(Number(event.target.value))
        }
        if(Number(event.target.value)>-1&&possibleServices.content&&possibleServices.content.length>0) {
            devLog('handleServiceView (possibleService)',possibleServices.content[Number(event.target.value)])
            const integration=possibleServices.content[Number(event.target.value)]
            if(integration.deploymentPhase&&integration?.configurationEntity?.set?.name&&integration.id) {
                handleService({environment: integration.deploymentPhase, name: integration.configurationEntity.set.name, setId: integration.id})
                setServiceIndex(Number(event.target.value))    
            }
            
        }
        
    }

    const addEnv = (value:number|undefined) => {
        
        if(value !== undefined) {
            if(value===0) {
                return <FormattedMessage defaultMessage="Testi" />
            }
            if(value===1) {
                return <FormattedMessage defaultMessage="Tuotanto" />
            }
            if(value===2) {
                return <FormattedMessage defaultMessage="Tuotanto-Testi" />
            }
            return value;
        } else {
            return ''
        }
            
        
        
    }
    
    const possibleServices: Components.Schemas.PageIntegration = useIntegrationsSpecSearchPageable(
        {
            search: oid,
            role: 'set',
            page: 0,
            size: 100,
          } as any
    );

    if(possibleServices.content&&possibleServices.content.length>0) {
        return (<Select
            labelId="palvelu"
            id="palvelu"
            value={String(serviceIndex)}
            onChange={handleServiceView}
            variant="standard"
            sx={{ marginRight: "auto"}}
        >
            <MenuItem key={'valitse'} value={-3}>
                <FormattedMessage defaultMessage="Valitse" />
            </MenuItem>
            <MenuItem key={'uusi_2'} value={-2}>
                {addEnv(0)} - uusi
            </MenuItem>
            <MenuItem key={'uusi_1'} value={-1}>
                {addEnv(1)} - uusi
            </MenuItem>
            {possibleServices.content.map((integration,index) => {          
                return(<MenuItem key={integration.configurationEntity?.set?.name+"_"+index} value={index} >
                        {addEnv(integration?.deploymentPhase)} - {integration?.configurationEntity?.set?.name}
                    </MenuItem>)
            })}
        </Select>)
    } else {
        return(<></>)
    }
    
}

export default PossibleServices;