import { getBlankIntegration } from "@/api";
import { useMe } from "@/api/käyttöoikeus";
import type { SelectChangeEvent} from "@mui/material";
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, InputLabel, MenuItem, Select, Grid } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

export const defaults = {
    integration: "idp",
    //integrations: [ { "label": "Koulutustoimija", "role": "idp" }, { "label": "Palveluintegraatio", "role": "sp" } ],
    integrations: [ { "label": "Koulutustoimija", "role": "idp" } ],
    typePI: "SAML",
    typesPI: [ "SAML", "OIDC" ],
    typeOKJ: "Wilma",
    //typesOKJ: [ "Opinsys", "Wilma", "Adfs", "Azure", "Google" ]
    typesOKJ: [ "Wilma" ]
  };

  interface Props {
    open: boolean;
    setOpen: Dispatch<boolean>;
  }

function NewIntegrationSelection({ open, setOpen}: Props) {

    const [organization, setOrganization] = useState('');
    const [integration, setIntegration] = useState(defaults.integration);
    const [type, setType] = useState(defaults.typeOKJ);
    const [types, setTypes] = useState(defaults.typesOKJ);
    const me = useMe();
    const [organizations, setOrganizations] = useState<string[]>();
    const navigate = useNavigate();

    useEffect(() => {
        if(me?.groups) {
            const possibleOrganizations = me?.groups.filter(o=>o.startsWith('APP_MPASSID_TALLENTAJA_')).map(o=>o.replace('APP_MPASSID_TALLENTAJA_','')) || [];
            setOrganizations(possibleOrganizations);
            if(possibleOrganizations.length>0) {
                setOrganization(possibleOrganizations[0]);
            }
        }
    }, [me]);    

    const createIntegration = async () => {
        getBlankIntegration({role: integration, type: type, organization: organization})
            .then(result=>{
                result.id=0;
                navigate(`/muokkaa/uusi/`+integration+`/`+type+`/`+result.id, { state: result });
            })       
      };
    
      const handleOrganization = (event: SelectChangeEvent) => {
          const value = String(event.target.value);
          setOrganization(value)
      }; 
      
      const handleIntegration = (event: SelectChangeEvent) => {
        const value = String(event.target.value);
        if(value==="Palveluintegraatio") {
            setType(defaults.typePI)
            setTypes(defaults.typesPI)
        } else {
            setType(defaults.typeOKJ)
            setTypes(defaults.typesOKJ)
        }
        setIntegration(value)
    }; 

    const handleTypes = (event: SelectChangeEvent) => {
        const value = String(event.target.value);
        setType(value)
    }; 

    return(<Dialog
        open={open}
        onClose={()=>setOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <DialogTitle id="alert-dialog-title">
            <FormattedMessage defaultMessage="Luo uusi integraatio" />
        </DialogTitle>
        <DialogContent>
        <DialogContentText id="alert-dialog-description">
            <Grid container spacing={2}>
                <Grid item xs={4}>
                    <InputLabel id="organisaatio" sx={{ mr: 1, display: "inline", ml: "auto" }}>
                        <FormattedMessage defaultMessage="Organisaatio" />:
                    </InputLabel>
                </Grid>
                <Grid item xs={8} >
                    <Select
                        
                        labelId="organisaatio"
                        id="organisaatio"
                        value={organization}
                        onChange={handleOrganization}
                        variant="standard"
                        sx={{ mr: 1,alignContent: "flex-end"}}
                    >
                        {organizations&&organizations.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                        ))}
                    </Select>
                </Grid>
                <Grid item xs={4}>
                    <InputLabel id="integraatio" sx={{ mr: 1, display: "inline", marginLeft: "auto" }}>
                        <FormattedMessage defaultMessage="integraatio" />:
                    </InputLabel>
                </Grid>
                <Grid item xs={8}>
                    <Select
                        labelId="integraatio"
                        id="integraatio"
                        value={integration}
                        onChange={handleIntegration}
                        variant="standard"
                        sx={{ marginRight: "auto"}}
                    >
                        {defaults.integrations.map((option) => (
                        <MenuItem key={option.label} value={option.role}>
                            {option.label}
                        </MenuItem>
                        ))}
                    </Select>
                </Grid>
                <Grid item xs={4}>
                    <InputLabel id="tyyppi" sx={{ mr: 1, display: "inline", marginLeft: "auto" }}>
                        <FormattedMessage defaultMessage="tyyppi" />:
                    </InputLabel>
                </Grid>
                <Grid item xs={8}>
                    <Select
                        labelId="tyyppi"
                        id="tyyppi"
                        value={type}
                        onChange={handleTypes}
                        variant="standard"
                        sx={{ marginRight: "auto"}}
                    >
                        {types.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                        ))}
                    </Select>
                </Grid>
            </Grid>
        </DialogContentText>
        </DialogContent>
        <DialogActions>
            
                <Button sx={{ marginRight: "auto" }} onClick={()=>setOpen(false)} >
                    <FormattedMessage defaultMessage="Peruuta" />
                </Button>                              
                <Button onClick={createIntegration} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Luo" /></Button>
            
        </DialogActions>
    </Dialog>)    

}

export default NewIntegrationSelection;