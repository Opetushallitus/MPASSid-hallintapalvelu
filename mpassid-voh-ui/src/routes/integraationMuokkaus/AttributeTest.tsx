import type { Components} from '@/api';
import { testAttributes, testAttributesAuthorization } from '@/api';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, InputAdornment, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import type { Dispatch} from 'react';
import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Visibility, VisibilityOff } from "@mui/icons-material";
import type { UiConfiguration } from '@/config';
import { attributePreferredOrder } from '@/config';

interface Props {
    id: string;
    attributes: Components.Schemas.Attribute[];
    open: boolean;
    oid: string;
    tenantId: string| undefined;
    environment: number;
    dataConfiguration: UiConfiguration[];
    setOpen: Dispatch<boolean>;
  }


export default function AttributeTest({ id,attributes, open, setOpen, oid, environment,tenantId,dataConfiguration }: Props){
    const intl = useIntl();
    const [isValidPrincipal, setIsValidPrincipal] = useState(true);
    const [isKnown, setIsKnown] = useState(true);
    const [isValidClientId, setIsValidClientId] = useState(true);
    const [isValidClientSecret, setIsValidClientSecret] = useState(true);
    const [sessionAuthenticated, setSessionAuthenticated] = useState(false);
    const [authenticationAlert, setAuthenticationAlert ] = useState(false);
    const [usedHelperTextPrincipal, setUsedHelperTextPrincipal] = useState<JSX.Element>(<></>);
    const [usedHelperTextClientId, setUsedHelperTextClientId] = useState<JSX.Element>(<></>);
    const [usedHelperTextClientSecret, setUsedHelperTextClientSecret] = useState<JSX.Element>(<></>);
    const [attributeResult, setAttributeResult] = useState<any>({});
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
    
    
    useEffect(() => {
        if(!open){
            setAttributeResult({})
            setAuthenticationAlert(false)
            setLoading(false)
        } 
      }, [open]);

      useEffect(() => {
        if((principal==="")) {
            setUsedHelperTextPrincipal(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValidPrincipal(false)
        } else {
            setIsValidPrincipal(true)               
            setUsedHelperTextPrincipal(<></>)
        }
      }, [principal]);  

      useEffect(() => {
        if((clientId==="")) {
            setUsedHelperTextClientId(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValidClientId(false)
        } else {
            setIsValidClientId(true)               
            setUsedHelperTextClientId(<></>)
        }
      }, [clientId]);  

      useEffect(() => {
        if((clientSecret==="")) {
            setUsedHelperTextClientSecret(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValidClientSecret(false)
        } else {
            setIsValidClientSecret(true)               
            setUsedHelperTextClientSecret(<></>)
        }
      }, [clientSecret]);  

    const onlyUnique = (value: string, index: number, array: string[]) => {
        return array.indexOf(value) === index;
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
        var attributeList:string[] = [];
        setAuthenticationAlert(false)
        setLoading(true);
        setIsKnown(true);
        if(!sessionAuthenticated) {
            if(principal&&clientId&&clientSecret) {
                attributeList=getAttributeList()||[];
                if(!sessionAuthenticated){
                    const authRequest:Components.Schemas.AttributeTestAuthorizationRequestBody={};
                    authRequest.id=parseInt(id);
                    if(id==='0'&&tenantId&&tenantId!=="") {
                        authRequest.tenantId=tenantId;
                    }
                    authRequest.clientId=clientId;
                    authRequest.clientSecret=clientSecret;
                    
                    testAttributesAuthorization({},authRequest).then(result=>{ 
                        setSessionAuthenticated(true)
                        testAttributes({ principal: principal, select: attributeList}).then(result=>{
                            setAttributeResult(result)                            
                            setLoading(false);
                        }).catch(error=>{
                            setUsedHelperTextPrincipal(<FormattedMessage defaultMessage="Tuntematon tilaaja" />)
                            setLoading(false);
                            setIsKnown(false);
                        })
                    }).catch(error=>{
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
                    setAttributeResult(result)                            
                    setLoading(false);
                }).catch(error=>{
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
                    inputProps={{
                        autoComplete: "off",
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
                    InputProps={{
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
                    inputProps={{
                        autoComplete: "off",
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
                        var value="";
                        
                        
                        const visible = (configuration.integrationType.filter(type=>type.name==="azure"||type.name==="default").length>0&&configuration.integrationType.filter(type=>type.name==="azure"||type.name==="default")[0].visible);
                        if(visible&&attributes.filter(attribute=>attribute.name===configuration.name).length>0) {
                            const attrib=attributes.filter(attribute=>attribute.name===configuration.name)[0];
                            const key=attrib.content||"";
                            if(key.includes(".")) {                                                      
                                if(attrib.content?.split(".",2)[1]) {
                                    const key1=attrib.content?.split(".",2)[0]
                                    const key2=attrib.content?.split(".",2)[1]
                                    if(attributeResult[key1]&&key2) {
                                        value=(attributeResult[key1])[key2]
                                    } 
                                }                                                                    
                            } else {
                                if(attrib.content&&attributeResult[attrib.content]) {
                                    value=attributeResult[attrib.content];
                                }
                                
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