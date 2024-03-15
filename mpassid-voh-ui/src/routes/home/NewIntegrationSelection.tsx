import { Box, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, InputLabel, MenuItem, Select, SelectChangeEvent, Grid } from "@mui/material";
import { Dispatch, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";

export const defaults = {
    organization: "1.2.246.562.10.00000000001",
    organizations: [ "1.2.246.562.10.00000000001", "1.2.246.562.10.00000000002", "1.2.246.562.10.00000000003"],
    integration: "sp",
    integrations: [ { "label": "Koulutustoimija", "role": "idp" }, { "label": "Palveluintegraatio", "role": "sp" } ],
    typePI: "SAML",
    typesPI: [ "SAML", "OIDC" ],
    typeOKJ: "Wilma",
    typesOKJ: [ "Opinsys", "Wilma", "Adfs", "Azure", "Google" ]
  };

  interface Props {
    open: boolean;
    setOpen: Dispatch<boolean>;
  }

function NewIntegrationSelection({ open, setOpen}: Props) {

    const [organization, setOrganization] = useState(defaults.organization);
    const [integration, setIntegration] = useState(defaults.integration);
    const [type, setType] = useState(defaults.typePI);
    const [types, setTypes] = useState(defaults.typesPI);
    

    const createIntegration = async () => {
        console.log("TBD!")
      };

    const cannotSave = () => {
    
        if(true) {
          return true;
        }
        return false;
      }
    
      const handleOrganization = (event: SelectChangeEvent) => {
          const value = String(event.target.value);
          console.log("value: ",value);  
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
        console.log("value: ",value);  
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
                        {defaults.organizations.map((option) => (
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
                {!cannotSave()&&<Button onClick={createIntegration} sx={{ marginLeft: "auto" }} disabled><FormattedMessage defaultMessage="Luo" /></Button>}
                {cannotSave()&&<Button component={Link} to={"/uusi/"+integration+"/"+type+"/"+0} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Luo" /></Button>}
            
        </DialogActions>
    </Dialog>)    

}

export default NewIntegrationSelection;