import { getBlankIntegration } from "@/api";

import { useMe } from "@/api/käyttöoikeus";
import { getOrganisaatioNimet } from "@/api/organisaatio";
import type { SelectChangeEvent} from "@mui/material";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, InputLabel, MenuItem, Select, Grid } from "@mui/material";
import type { Dispatch} from "react";
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from "react-router-dom";
import toLanguage from "@/utils/toLanguage";
import { devLog } from "@/utils/devLog";
import PossibleServices from "./PossibleServices";
import { integrationTypesDefault } from "@/config";
import { clone } from "lodash";

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
    const [types, setTypes] = useState(defaults.typesPI);
    const [service, setService] = useState<serviceProps>();
    const me = useMe();
    const [organizations, setOrganizations] = useState<Organization[]>();
    const navigate = useNavigate();
    const language = toLanguage(useIntl().locale).toLowerCase();
    const possibleOrganizationsOidsIdp = useRef<string[]>([]);
    const possibleOrganizationsOidsAll = useRef<string[]>([]);
    
    const intl = useIntl();
    useEffect(() => {
        
        
        if(me?.groups) {
            const organizationNames: Organization[] = [];
            possibleOrganizationsOidsIdp.current=[];
            possibleOrganizationsOidsAll.current=[];
            me?.groups.filter(o=>o.startsWith('APP_MPASSID_TALLENTAJA_')).forEach(o=>{
                possibleOrganizationsOidsIdp.current.push(o.replace('APP_MPASSID_TALLENTAJA_',''))
                possibleOrganizationsOidsAll.current.push(o.replace('APP_MPASSID_TALLENTAJA_',''))
            });
            me?.groups.filter(o=>o.startsWith('APP_MPASSID_PALVELU_TALLENTAJA_')).forEach(o=>possibleOrganizationsOidsAll.current.push(o.replace('APP_MPASSID_PALVELU_TALLENTAJA_','')));
            
            devLog("DEBUG","NewIntegrationSelection (possibleOrganizationsOidsAll)",possibleOrganizationsOidsAll.current)
            possibleOrganizationsOidsAll.current.forEach(oid=>{
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
                    if(possibleOrganizationsOidsAll.current.length===organizationNames.length) {
                        setOrganizations(organizationNames)
                        setOrganization(organizationNames[0].oid)
                    }
                })
                .catch(error=>{
                    const newOrganizationName = { oid: oid, name: oid }
                    organizationNames.push(newOrganizationName)
                    if(possibleOrganizationsOidsAll.current.length===organizationNames.length) {
                        setOrganizations(organizationNames)
                        setOrganization(organizationNames[0].oid)
                    }
                })
                
            })
        
            
            
            
        }
    }, [language, me]);
    /*
    useEffect(() => {
        
        
        if(me?.groups) {
            const organizationNames: Organization[] = [];
            const possibleOrganizationsOids = me?.groups.filter(o=>o.startsWith('APP_MPASSID_TALLENTAJA_')).map(o=>o.replace('APP_MPASSID_TALLENTAJA_','')) || [];
            //possibleOrganizationsOids.concat(me?.groups.filter(o=>o.startsWith('APP_MPASSID_PALVELU_TALLENTAJA_')).map(o=>o.replace('APP_MPASSID_PALVELU_TALLENTAJA_','')) || []);
            devLog("DEBUG","NewIntegrationSelection (possibleOrganizationsOids)",possibleOrganizationsOids)
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
    useEffect(() => {
        
        
        if(open) {
            setService(undefined)
        }
    }, [open]);

    useEffect(() => {
        if(integration==="sp") {
            setType(defaults.typePI)
            setTypes(defaults.typesPI)
        } else {
            setType(defaults.typeOKJ)
            setTypes(defaults.typesOKJ)
        }
    }, [integration]);

    useEffect(() => {
        if(possibleOrganizationsOidsIdp.current.length>0&&possibleOrganizationsOidsIdp.current.indexOf(organization)>=0) {
            setIntegration('idp')
        } else {
            setIntegration('sp')
        }
    }, [organization]);


    

    const createIntegration = async () => {
        getBlankIntegration({role: integration, type: type.toLowerCase(), organization: organization})
            .then(result=>{
                devLog("DEBUG","createIntegration (result)",result)
                result.id=0;
                if(result?.configurationEntity?.sp) {
                    devLog("DEBUG","createIntegration (oldSet)",service)
                    if(service!==undefined) {
                        result.configurationEntity.sp.name=service.name
                        result.deploymentPhase=service.environment                        
                        result.integrationSets=[]
                        result.integrationSets.push( { id: service.setId })

                        
                        devLog("DEBUG","createIntegration (type service.environment)",(typeof service.environment))
                        devLog("DEBUG","createIntegration (service.environment)",service.environment)
                    }
                    
                }
                if(result?.configurationEntity?.idp) {
                    result.deploymentPhase=1                  
                }
                if(result?.configurationEntity?.sp&&result.configurationEntity.sp.metadata===null) {
                    result.configurationEntity.sp.metadata={}
                }
                devLog("DEBUG","createIntegration (integration)",result)
                navigate(`/muokkaa/`+integration+`/`+type+`/`+result.id, { state: result });
            })       
      };
    
      const handleOrganization = (event: SelectChangeEvent) => {
          const value = String(event.target.value);
          setOrganization(value)
      }; 
      
      const handleIntegration = (event: SelectChangeEvent) => {

        devLog("DEBUG","handleIntegration (value)",String(event.target.value))
        const value = String(event.target.value);
        setIntegration(value)
        
        
    }; 

    

        
        
     

    const handleTypes = (event: SelectChangeEvent) => {
        const value = String(event.target.value);
        setType(value)
    }; 

    const handleService = (value: serviceProps) => {
        devLog("DEBUG","handleService",value)
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

                        {possibleOrganizationsOidsIdp.current.length>0&&possibleOrganizationsOidsIdp.current.indexOf(organization)>=0&&
                            <MenuItem key={'koulutustoimija'} value={'idp'}>
                                <FormattedMessage defaultMessage='Koulutustoimija'/>
                            </MenuItem>}
                        <MenuItem key={'palveluintegraatio'} value={'sp'}>
                            <FormattedMessage defaultMessage='Palveluintegraatio' />
                        </MenuItem>
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
                {integration==='sp'&&(<>
                    <Grid item xs={4}>
                        <InputLabel id="palvelu" sx={{ mr: 1, display: "inline", marginLeft: "auto" }}>
                            <FormattedMessage defaultMessage="palvelu" />:
                        </InputLabel>
                    </Grid>
                    <Grid item xs={8}>
                        
                            
                            <PossibleServices oid={organization} handleService={handleService} />
                            
                        
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