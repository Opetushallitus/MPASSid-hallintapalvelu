import { getBlankIntegration } from "@/api";
import { useMe } from "@/api/käyttöoikeus";
import { getOrganisaatioNimet } from "@/api/organisaatio";
import type { SelectChangeEvent} from "@mui/material";
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, InputLabel, MenuItem, Select, Grid } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from "react-router-dom";
import toLanguage from "@/utils/toLanguage";

export const defaults = {
    typePI: "SAML",
    typesPI: [ "SAML", "OIDC" ],
    typeOKJ: "wilma",
    //typesOKJ: [ "Opinsys", "Wilma", "Adfs", "Azure", "Google" ]
    typesOKJ: [ "wilma" ]
  };

  interface Props {
    open: boolean;
    setOpen: Dispatch<boolean>;
  }

  interface Organization {
    oid: string;
    name: string;
  }

function NewIntegrationSelection({ open, setOpen}: Props) {

    const [organization, setOrganization] = useState('');
    const [integration, setIntegration] = useState('idp');
    const [type, setType] = useState(defaults.typeOKJ);
    const [types, setTypes] = useState(defaults.typesOKJ);
    const me = useMe();
    const [organizations, setOrganizations] = useState<Organization[]>();
    const navigate = useNavigate();
    const language = toLanguage(useIntl().locale).toLowerCase();

    const intl = useIntl();

    useEffect(() => {
        
        
        if(me?.groups) {
            const organizationNames: Organization[] = [];
            const possibleOrganizationsOids = me?.groups.filter(o=>o.startsWith('APP_MPASSID_TALLENTAJA_')).map(o=>o.replace('APP_MPASSID_TALLENTAJA_','')) || [];
            
            possibleOrganizationsOids.forEach(oid=>{
                const newOrganizationName = { oid: oid, name: '' }
                getOrganisaatioNimet(oid).then(response=>{
                    var found=false;
                    response.forEach(organisation=>{
                        if(organisation?.oid===oid&&organisation?.nimi) {
                            if(organisation?.nimi[language]) {
                                newOrganizationName.name=organisation?.nimi[language];
                            } else {
                                newOrganizationName.name=oid;
                            }
                            found=true;
                        }
                    })
                    if(!found) {
                        newOrganizationName.name=oid;
                    }
                    organizationNames.push(newOrganizationName);
                    if(possibleOrganizationsOids.length===organizationNames.length) {
                        setOrganizations(organizationNames)
                        setOrganization(organizationNames[0].oid)
                    }
                })
                .catch(error=>{
                    const newOrganizationName = { oid: oid, name: oid }
                    organizationNames.push(newOrganizationName)
                    if(possibleOrganizationsOids.length===organizationNames.length) {
                        setOrganizations(organizationNames)
                        setOrganization(organizationNames[0].oid)
                    }
                })
                
            })
        
            
            
            
        }
    }, [language, me]);    

    const createIntegration = async () => {
        getBlankIntegration({role: integration, type: type.toLowerCase(), organization: organization})
            .then(result=>{
                result.id=0;
                navigate(`/muokkaa/`+integration+`/`+type+`/`+result.id, { state: result });
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
                        <MenuItem key={option.name} value={option.oid}>
                            {option.name}
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
                        <MenuItem key={'koulutustoimija'} value={'idp'}>
                            <FormattedMessage defaultMessage='Koulutustoimija'/>
                        </MenuItem>
                        {false&&<MenuItem key={'Palveluintegraatio'} value={'sp'}>
                            <FormattedMessage defaultMessage='Palveluintegraatio' />
                        </MenuItem>}
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
                        {types.map((option) => {        
                            const id = `tyyppi.${option}`;
                            const label = id in intl.messages ? { id } : undefined;    
                            return(<MenuItem key={option} value={option}>
                                    {label ? <FormattedMessage {...label} /> : option}
                                </MenuItem>)
                        })}
                        
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