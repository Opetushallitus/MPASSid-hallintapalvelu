import { getBlankIntegration } from "@/api";

import { useMe } from "@/api/käyttöoikeus";
import { getOrganisaatioNimet } from "@/api/organisaatio";
import type { SelectChangeEvent} from "@mui/material";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, InputLabel, MenuItem, Select, Grid } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from "react-router-dom";
import toLanguage from "@/utils/toLanguage";
import { createLogger, redactSecrets } from "@/utils/devLog";
import PossibleServices from "./PossibleServices";
import Suspense from "@/utils/components/Suspense";
import { integrationTypesDefault } from "@/config";
import { clone } from "lodash";

const debugLog = createLogger("DEBUG");
const warnLog = createLogger("WARN");

const defaults = clone(integrationTypesDefault);

  if(!ENV.PROD) {
    //defaults.typesPI.push("oidc")
    //defaults.typesOKJ.push("opinsys")
  }
  interface Props {
    open: boolean;
    setOpen: Dispatch<boolean>;
  }

  interface Organization {
    oid: string;
    name: string;
  }

  interface serviceProps {
    name:string;
    environment:number;  
    setId:number;  
}  

function NewIntegrationSelection({ open, setOpen}: Props) {

    const [organization, setOrganization] = useState('');
    const [integration, setIntegration] = useState('sp');
    const [type, setType] = useState(defaults.typePI);
    const [service, setService] = useState<serviceProps>();
    const me = useMe();
    const [organizations, setOrganizations] = useState<Organization[]>();
    const navigate = useNavigate();
    const language = toLanguage(useIntl().locale).toLowerCase();
    // The organizations the user may create integrations for: idp (OKJ)
    // ones, and all (idp + service integration ones).
    const { idp: possibleOrganizationsOidsIdp, all: possibleOrganizationsOidsAll } = useMemo(() => {
        const idp = me?.groups?.filter(o=>o.startsWith('APP_MPASSID_TALLENTAJA_')).map(o=>o.replace('APP_MPASSID_TALLENTAJA_','')) ?? [];
        const sp = me?.groups?.filter(o=>o.startsWith('APP_MPASSID_PALVELU_TALLENTAJA_')).map(o=>o.replace('APP_MPASSID_PALVELU_TALLENTAJA_','')) ?? [];
        return { idp, all: [...idp, ...sp] };
    }, [me]);
    // Once the user explicitly picks an integration type, a new organization
    // must stop auto-overriding it. Under React 19 the async organization
    // (re)resolution can change it after the user has chosen, snapping
    // "Palveluintegraatio" back to "Koulutustoimija".
    const [userChoseIntegration, setUserChoseIntegration] = useState(false);
    
    const intl = useIntl();
    useEffect(() => {
        
        
        if(me?.groups) {
            const organizationNames: Organization[] = [];
            debugLog("NewIntegrationSelection (possibleOrganizationsOidsAll)",possibleOrganizationsOidsAll)
            possibleOrganizationsOidsAll.forEach(oid=>{
                const newOrganizationName = { oid: oid, name: '' }
                getOrganisaatioNimet(oid).then(response=>{
                    let found=false;
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
                    if(possibleOrganizationsOidsAll.length===organizationNames.length) {
                        setOrganizations(organizationNames)
                        setOrganization(organizationNames[0].oid)
                    }
                })
                .catch(error=>{
                    warnLog("NewIntegrationSelection (organisaation nimen haku epäonnistui, näytetään OID)", oid, error)
                    const newOrganizationName = { oid: oid, name: oid }
                    organizationNames.push(newOrganizationName)
                    if(possibleOrganizationsOidsAll.length===organizationNames.length) {
                        setOrganizations(organizationNames)
                        setOrganization(organizationNames[0].oid)
                    }
                })
                
            })
        
            
            
            
        }
    }, [language, me, possibleOrganizationsOidsAll]);
    /*
    useEffect(() => {
        
        
        if(me?.groups) {
            const organizationNames: Organization[] = [];
            const possibleOrganizationsOids = me?.groups.filter(o=>o.startsWith('APP_MPASSID_TALLENTAJA_')).map(o=>o.replace('APP_MPASSID_TALLENTAJA_','')) || [];
            //possibleOrganizationsOids.concat(me?.groups.filter(o=>o.startsWith('APP_MPASSID_PALVELU_TALLENTAJA_')).map(o=>o.replace('APP_MPASSID_PALVELU_TALLENTAJA_','')) || []);
            debugLog("NewIntegrationSelection (possibleOrganizationsOids)",possibleOrganizationsOids)
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
    */
    const organizationHasIdp = possibleOrganizationsOidsIdp.indexOf(organization)>=0;
    const types = integration==="sp" ? defaults.typesPI : defaults.typesOKJ;

    // Adjusted while rendering instead of in effects (same triggers):
    // opening the dialog clears the service and the user's integration choice,
    const [prevOpen, setPrevOpen] = useState(open);
    if(open!==prevOpen) {
        setPrevOpen(open);
        if(open) {
            setService(undefined)
            setUserChoseIntegration(false)
        }
    }
    // a new integration (idp/sp) resets the type to its default,
    const [prevIntegration, setPrevIntegration] = useState(integration);
    if(integration!==prevIntegration) {
        setPrevIntegration(integration);
        setType(integration==="sp" ? defaults.typePI : defaults.typeOKJ)
    }
    // and a new organization picks the integration, unless the user chose one.
    const [prevOrganization, setPrevOrganization] = useState(organization);
    if(organization!==prevOrganization) {
        setPrevOrganization(organization);
        if(!userChoseIntegration) {
            setIntegration(organizationHasIdp ? 'idp' : 'sp')
        }
    }


    const createIntegration = async () => {
        getBlankIntegration({role: integration, type: type.toLowerCase(), organization: organization})
            .then(result=>{
                debugLog("createIntegration (result)",redactSecrets(result))
                result.id=0;
                if(result?.configurationEntity?.sp) {
                    debugLog("createIntegration (oldSet)",service)
                    if(service!==undefined) {
                        if(service.setId!==0) {
                          // setId 0 marks the "create a brand-new environment"
                          // options in PossibleServices.tsx, whose `name` is
                          // just the literal sentinel "uusi" used to render
                          // their dropdown label ("Testi - uusi") - not a real
                          // service name to carry over. Only an actual existing
                          // set (setId!==0) has a real name worth reusing, so
                          // that a service keeps the same display name across
                          // its environments.
                          result.configurationEntity.sp.name=service.name
                        }
                        result.deploymentPhase=service.environment
                        result.integrationSets=[]
                        result.integrationSets.push( { id: service.setId })

                        
                        debugLog("createIntegration (type service.environment)",(typeof service.environment))
                        debugLog("createIntegration (service.environment)",service.environment)
                    }
                    
                }
                if(result?.configurationEntity?.idp) {
                    result.deploymentPhase=1                  
                }
                if(result?.configurationEntity?.sp&&result.configurationEntity.sp.metadata===null) {
                    result.configurationEntity.sp.metadata={}
                }
                debugLog("createIntegration (integration)",redactSecrets(result))
                navigate(`/muokkaa/`+integration+`/`+type+`/`+result.id, { state: result });
            })       
      };
    
      const handleOrganization = (event: SelectChangeEvent) => {
          const value = String(event.target.value);
          setOrganization(value)
      }; 
      
      const handleIntegration = (event: SelectChangeEvent) => {

        debugLog("handleIntegration (value)",String(event.target.value))
        const value = String(event.target.value);
        setUserChoseIntegration(true)
        setIntegration(value)
        
        
    }; 

    

        
        
     

    const handleTypes = (event: SelectChangeEvent) => {
        const value = String(event.target.value);
        setType(value)
    }; 

    const handleService = (value: serviceProps) => {
        debugLog("handleService",value)
        setService(value)
    }; 
    
    return(<Dialog
        open={open}
        maxWidth={"md"}
        onClose={()=>setOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <DialogTitle id="alert-dialog-title">
            <FormattedMessage defaultMessage="Luo uusi integraatio" />
        </DialogTitle>
        <DialogContent>
            <Grid container spacing={2}>
                <Grid size={4}>
                    <InputLabel id="organisaatio" sx={{ mr: 1, display: "inline", ml: "auto" }}>
                        <FormattedMessage defaultMessage="Organisaatio" />:
                    </InputLabel>
                </Grid>
                <Grid size={8} >
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
                <Grid size={4}>
                    <InputLabel id="integraatio" sx={{ mr: 1, display: "inline", marginLeft: "auto" }}>
                        <FormattedMessage defaultMessage="integraatio" />:
                    </InputLabel>
                </Grid>
                <Grid size={8}>
                    <Select
                        labelId="integraatio"
                        id="integraatio"
                        value={integration}
                        onChange={handleIntegration}                
                        variant="standard"
                        sx={{ marginRight: "auto"}}
                    >

                        {organizationHasIdp&&
                            <MenuItem key={'koulutustoimija'} value={'idp'}>
                                <FormattedMessage defaultMessage='Koulutustoimija'/>
                            </MenuItem>}
                        <MenuItem key={'palveluintegraatio'} value={'sp'}>
                            <FormattedMessage defaultMessage='Palveluintegraatio' />
                        </MenuItem>
                    </Select>
                </Grid>
                <Grid size={4}>
                    <InputLabel id="tyyppi" sx={{ mr: 1, display: "inline", marginLeft: "auto" }}>
                        <FormattedMessage defaultMessage="tyyppi" />:
                    </InputLabel>
                </Grid>
                <Grid size={8}>
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
                {integration==='sp'&&(<>
                    <Grid size={4}>
                        <InputLabel id="palvelu" sx={{ mr: 1, display: "inline", marginLeft: "auto" }}>
                            <FormattedMessage defaultMessage="palvelu" />:
                        </InputLabel>
                    </Grid>
                    <Grid size={8}>
                        <Suspense inline>
                            <PossibleServices oid={organization} handleService={handleService} />
                        </Suspense>
                    </Grid>
                </>)}
            </Grid>
        
        </DialogContent>
        <DialogActions>
            
                <Button sx={{ marginRight: "auto" }} onClick={()=>setOpen(false)} >
                    <FormattedMessage defaultMessage="Peruuta" />
                </Button>                              
                {!(!service&&integration==='sp')&&<Button onClick={createIntegration} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Luo" /></Button>}
                {!service&&integration==='sp'&&<Button onClick={createIntegration} sx={{ marginLeft: "auto" }} disabled><FormattedMessage defaultMessage="Luo" /></Button>}
            
        </DialogActions>
    </Dialog>)    

}

export default NewIntegrationSelection;