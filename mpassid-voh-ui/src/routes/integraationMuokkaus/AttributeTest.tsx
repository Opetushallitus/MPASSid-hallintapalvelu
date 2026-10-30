import type { Components} from '@/api';
import { testAttributes, testAttributesAuthorization } from '@/api';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, InputAdornment, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import type { Dispatch, JSX } from 'react';
import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Visibility, VisibilityOff } from "@mui/icons-material";
import type { UiConfiguration } from '@/config';
import { attributePreferredOrder } from '@/config';
import { createLogger } from "@/utils/devLog";

const warnLog = createLogger("WARN");

interface Props {
    id: string;
    attributes: Components.Schemas.Attribute[];
    open: boolean;
    oid: string;
    environment: number;
    dataConfiguration: UiConfiguration[];
    setOpen: Dispatch<boolean>;
  }


export default function AttributeTest({ id,attributes, open, setOpen, oid, environment,dataConfiguration }: Props){
    const intl = useIntl();
    const [isKnown, setIsKnown] = useState(true);
    const [sessionAuthenticated, setSessionAuthenticated] = useState(false);
    const [authenticationAlert, setAuthenticationAlert ] = useState(false);
    const [usedHelperTextPrincipal, setUsedHelperTextPrincipal] = useState<JSX.Element>(<></>);
    // Attribute values keyed by attribute name (the schema types the response as string[]).
    const [attributeResult, setAttributeResult] = useState<Record<string, unknown>>({});
    const [showClientSecret, setShowClientSecret] = useState(false);
    const [principal, setPrincipal] = useState<string>();
    const [clientId, setClientId] = useState<string>();
    const [clientSecret, setClientSecret] = useState<string>();
    const [loading, setLoading] = useState<boolean>(false);
    const specialConfiguration:string[] = dataConfiguration.filter(conf=>conf.oid&&conf.oid===oid).map(conf=>conf.name) || [];
    const environmentConfiguration:string[] = dataConfiguration.filter(conf=>conf.environment!==undefined&&conf.environment===environment).map(conf=>conf.name) || [];
    const configurations:UiConfiguration[] = dataConfiguration
    .filter((configuration) => configuration.type === "user")
    .filter((configuration) => (environmentConfiguration.includes(configuration.name)&&configuration.environment===environment)||(!environmentConfiguration.includes(configuration.name)&&configuration.environment===undefined))
    .filter((configuration) => (specialConfiguration.includes(configuration.name)&&configuration.oid===oid)||(!specialConfiguration.includes(configuration.name)&&!configuration.oid))
    .map((configuration) => {
      const id = `attribuutti.${configuration.name}`;
      const label = id in intl.messages ? { id } : undefined;

      return {
        ...configuration,
        label: label && intl.formatMessage(label),
      };
    })
    .filter(({ name }) => name)
    .sort(
      (a, b) =>
        2 *
          (attributePreferredOrder.indexOf(b.name!) -
            attributePreferredOrder.indexOf(a.name!)) -
        (b.label ?? b.name!).localeCompare(a.label ?? a.name!)
    )
    
    
    // Adjusted while rendering instead of in effects: closing the dialog
    // clears the result,
    const [prevOpen, setPrevOpen] = useState(open);
    if(open!==prevOpen) {
        setPrevOpen(open);
        if(!open){
            setAttributeResult({})
            setAuthenticationAlert(false)
            setLoading(false)
        }
    }

    // and a changed principal resets its helper text (a failed test may set
    // "Tuntematon tilaaja" there until the principal changes again).
    const [prevPrincipal, setPrevPrincipal] = useState(principal);
    if(principal!==prevPrincipal) {
        setPrevPrincipal(principal);
        setUsedHelperTextPrincipal(principal==="" ? <FormattedMessage defaultMessage="Pakollinen kenttä" /> : <></>)
    }

    // A field emptied by the user is invalid (untouched, undefined, is not).
    const isValidPrincipal = principal!=="";
    const isValidClientId = clientId!=="";
    const isValidClientSecret = clientSecret!=="";
    const usedHelperTextClientId = isValidClientId ? <></> : <FormattedMessage defaultMessage="Pakollinen kenttä" />;
    const usedHelperTextClientSecret = isValidClientSecret ? <></> : <FormattedMessage defaultMessage="Pakollinen kenttä" />;

    const onlyUnique = (value: string, index: number, array: string[]) => {
        return array.indexOf(value) === index;
    }

    // Attribuutin content on polku testAttributes-vastaukseen ("nimi",
    // "nimi.attribuutti", "nimi.attribuutti.taso1", ...). Polku puretaan
    // askel kerrallaan, joten vastaus saa olla miten syvästi tahansa
    // sisäkkäinen - aiemmin luettiin vain kaksi ensimmäistä tasoa.
    const resolveAttributeValue = (source: unknown, path: string): unknown =>
        path
            .split(".")
            .reduce<unknown>(
                (current, key) =>
                    current !== null && typeof current === "object"
                        ? (current as Record<string, unknown>)[key]
                        : undefined,
                source
            );

    // Polku voi osoittaa myös välitasolle tai monikolliseen arvoon, ja React
    // kaatuu jos soluun päätyy objekti, joten muu kuin alkeisarvo muunnetaan
    // näytettävään muotoon.
    const formatAttributeValue = (value: unknown): string => {
        if (value === undefined || value === null) {
            return "";
        }
        if (Array.isArray(value)) {
            return value.map(formatAttributeValue).join(", ");
        }
        if (typeof value === "object") {
            return JSON.stringify(value);
        }
        return String(value);
    }

    const readyToTest = () => {
        if(sessionAuthenticated) {
            if(!principal) {
                return false;
            }
            if(isValidPrincipal) {
                return true;
            }
        } else {
            if(!principal||!clientId||!clientSecret) {
                return false;
            }
            if(isValidPrincipal&&isValidClientId&&isValidClientSecret) {
                return true;
            }
        }
        
        
        return false;
    }

    const handleClickShowClientSecret = () => {
        setShowClientSecret(!showClientSecret);
    };

    const getAttributeList = () => {

        return attributes.filter(a=>a.content!==undefined)
                            .map(a=>a.content)
                            .map(c=> {
                                        if(c){
                                            return c.split(".",1)[0]
                                        } else {
                                            return ""
                                        }
                                    })
                            .filter(c=>c!=="")
                            .filter(onlyUnique)
        
        
    }
      
    const onUpdate = () => {
        let attributeList:string[] = [];
        setAuthenticationAlert(false)
        setLoading(true);
        setIsKnown(true);
        if(!sessionAuthenticated) {
            if(principal&&clientId&&clientSecret) {
                attributeList=getAttributeList()||[];
                if(!sessionAuthenticated){
                    // The backend reads the tenant id from the saved integration.
                    const authRequest:Components.Schemas.AttributeTestAuthorizationRequestBody={};
                    authRequest.id=parseInt(id);
                    authRequest.clientId=clientId;
                    authRequest.clientSecret=clientSecret;
                    
                    testAttributesAuthorization({},authRequest).then((authorized)=>{ 
                        // false (HTTP 200): the backend could not authorize, e.g.
                        // the integration is not saved yet.
                        if(authorized!==true) {
                            warnLog("testAttributesAuthorization (istuntoa ei valtuutettu)", authorized)
                            setSessionAuthenticated(false)
                            setAuthenticationAlert(true)
                            setLoading(false);
                            return
                        }
                        setSessionAuthenticated(true)
                        testAttributes({ principal: principal, select: attributeList}).then(result=>{
                            setAttributeResult(result as unknown as Record<string, unknown>)                            
                            setLoading(false);
                        }).catch(error=>{
                            warnLog("testAttributes (attribuuttihaku epäonnistui)", error)
                            setUsedHelperTextPrincipal(<FormattedMessage defaultMessage="Tuntematon tilaaja" />)
                            setLoading(false);
                            setIsKnown(false);
                        })
                    }).catch(error=>{
                        warnLog("testAttributesAuthorization (istunnon valtuutus epäonnistui)", error)
                        setSessionAuthenticated(false)
                        setAuthenticationAlert(true)
                        setLoading(false);
                    })
                }
                
            } 
        } else {
            if(principal) {
                attributeList=getAttributeList();                
                setSessionAuthenticated(true)
                testAttributes({ principal: principal, select: attributeList}).then(result=>{
                    setAttributeResult(result as unknown as Record<string, unknown>)                            
                    setLoading(false);
                }).catch(error=>{
                    warnLog("testAttributes (attribuuttihaku epäonnistui)", error)
                    setUsedHelperTextPrincipal(<FormattedMessage defaultMessage="Tuntematon tilaaja" />)
                    setLoading(false);
                    setIsKnown(false);
                })
                
            } 
        }
        

    }

    return(<Dialog
        open={open}
        onClose={()=>setOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="xl"
      >
        <DialogTitle id="alert-dialog-title">
            <FormattedMessage defaultMessage="Tarkista attribuuttien oikeellisuus" />
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
                {authenticationAlert&&<Alert severity="error">
                                            <FormattedMessage defaultMessage="Tilin authentikointi epäonnistui!" />
                                      </Alert>}
                {!sessionAuthenticated&&(<>
                    <TextField
                    sx={{ width: '100%'}}
                    variant="standard"
                    label={intl.formatMessage({
                        defaultMessage: "Client ID"},
                        {} 
                    )}
                    placeholder={intl.formatMessage({
                        defaultMessage: "Client ID"},
                        {} 
                    )}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    fullWidth
                    required={true}
                    error={!isValidClientId}
                    helperText={usedHelperTextClientId}
                    slotProps={{
                        htmlInput: {
                            autoComplete: "off",
                        },
                    }}
                />
                <TextField 
                    sx={{ width: '100%'}}
                    variant="standard"
                    type={showClientSecret ? 'text' : 'password'}
                    label={intl.formatMessage({
                        defaultMessage: "Client Key"},
                        {} 
                    )}
                    placeholder={intl.formatMessage({
                        defaultMessage: "Client Key"},
                        {} 
                    )}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    required={true}
                    helperText={usedHelperTextClientSecret}
                    slotProps={{
                        input: {
                        endAdornment: (
                            <InputAdornment position="end">
                            <IconButton
                                aria-label={intl.formatMessage({
                                    defaultMessage: "näytä",
                                  })}
                                onClick={handleClickShowClientSecret}
                                edge="end"
                            >
                                {showClientSecret ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                            </InputAdornment>
                        ),
                        autoComplete: "off",
                        },
                    }}
                    error={!isValidClientSecret}
                    fullWidth />
                
                </>)}
                {Object.keys(attributeResult).length===0&&<TextField
                    sx={{ width: '100%'}}
                    variant="standard"
                    label={intl.formatMessage({
                        defaultMessage: "Tarkistettava käyttäjä"},
                        {} 
                    )}
                    placeholder={intl.formatMessage({
                        defaultMessage: "Tarkistettava käyttäjä"},
                        {} 
                    )}
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    fullWidth
                    error={!isValidPrincipal||!isKnown}
                    helperText={usedHelperTextPrincipal}
                    required={true}
                    slotProps={{
                        htmlInput: {
                            autoComplete: "off",
                        },
                    }}
                />}
                
                {Object.keys(attributeResult).length>0&&<TableContainer component={Paper}>
                <Table sx={{ minWidth: 500 }} aria-label="attribute table">
                    <TableHead>
                        <TableRow>
                            <TableCell><FormattedMessage defaultMessage="Attribute name" /></TableCell>
                            <TableCell align="right"><FormattedMessage defaultMessage="Attribute value" /></TableCell>        
                        </TableRow>
                    </TableHead>
                    <TableBody>
                    {configurations
                    .map((configuration) => {
                        let value="";
                        
                        
                        const visible = (configuration.integrationType.filter(type=>type.name==="azure"||type.name==="default").length>0&&configuration.integrationType.filter(type=>type.name==="azure"||type.name==="default")[0].visible);
                        if(visible&&attributes.filter(attribute=>attribute.name===configuration.name).length>0) {
                            const attrib=attributes.filter(attribute=>attribute.name===configuration.name)[0];
                            const key=attrib.content||"";
                            if(key) {
                                value=formatAttributeValue(resolveAttributeValue(attributeResult,key));
                            }

                            return (<TableRow key={key}>
                                        <TableCell component="th" scope="row">
                                        <span>{configuration.label ? configuration.label : configuration.name}</span>
                                        </TableCell>
                                        <TableCell style={{ width: 160 }} align="right">
                                            {value}
                                        </TableCell>
                                        
                                        </TableRow>)
                        } else {
                            return (<></>)
                        }
                    })}
                    
                    </TableBody>
                    
                </Table>
                </TableContainer>}
            </DialogContentText>
        </DialogContent>
        {Object.keys(attributeResult).length===0&&<DialogActions>
          <Button onClick={()=>setOpen(false)} autoFocus>
          <FormattedMessage defaultMessage="PERUUTA" />
          </Button>
          <Button onClick={()=>onUpdate()} autoFocus disabled={loading||!readyToTest()}>
            {!loading&&<FormattedMessage defaultMessage="TESTAA" />}
            {loading&&<CircularProgress />}
          </Button>
        </DialogActions>}
        {Object.keys(attributeResult).length>0&&<DialogActions>
          <Button onClick={()=>setOpen(false)} autoFocus>
          <FormattedMessage defaultMessage="OK" />
          </Button>
        </DialogActions>}
      </Dialog>)
}