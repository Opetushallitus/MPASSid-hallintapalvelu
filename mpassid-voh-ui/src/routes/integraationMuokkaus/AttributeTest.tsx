import { Components, testAttributes, testAttributesAuthorization } from '@/api';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, IconButton, InputAdornment, InputLabel, OutlinedInput, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { ChangeEventHandler, Dispatch, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Visibility, VisibilityOff } from "@mui/icons-material";

interface Props {
    id: string;
    attributes: Components.Schemas.Attribute[];
    open: boolean;
    setOpen: Dispatch<boolean>;
  }


export default function AttributeTest({ id,attributes, open, setOpen }: Props){
    const intl = useIntl();
    const [isValid, setIsValid] = useState(true);
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
    
    
    useEffect(() => {
        if(!open){
            setAttributeResult({})
            setAuthenticationAlert(false)
        } 
      }, [open]);

      useEffect(() => {
        if((principal==="")) {
            setUsedHelperTextPrincipal(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValid(false)
        } else {
            setIsValid(true)               
            setUsedHelperTextPrincipal(<></>)
        }
      }, [principal]);  

      useEffect(() => {
        if((clientId==="")) {
            setUsedHelperTextClientId(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValid(false)
        } else {
            setIsValid(true)               
            setUsedHelperTextClientId(<></>)
        }
      }, [clientId]);  

      useEffect(() => {
        if((clientSecret==="")) {
            setUsedHelperTextClientSecret(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValid(false)
        } else {
            setIsValid(true)               
            setUsedHelperTextClientSecret(<></>)
        }
      }, [clientSecret]);  

    const onlyUnique = (value: string, index: number, array: string[]) => {
        return array.indexOf(value) === index;
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
        if(!sessionAuthenticated) {
            if(principal&&clientId&&clientSecret) {
                attributeList=getAttributeList()||[];
                if(!sessionAuthenticated){
                    const authRequest:Components.Schemas.AttributeTestAuthorizationRequestBody={};
                    authRequest.id=parseInt(id);
                    authRequest.clientId=clientId;
                    authRequest.clientSecret=clientSecret;
                    
                    testAttributesAuthorization({},authRequest).then(result=>{ 
                        setSessionAuthenticated(true)
                        testAttributes({ principal: principal, select: attributeList}).then(result=>{
                            setAttributeResult(result)                            
                        }).catch(error=>{
                            setUsedHelperTextPrincipal(<FormattedMessage defaultMessage="Tuntematon tilaaja" />)
                        })
                    }).catch(error=>{
                        setSessionAuthenticated(false)
                        setAuthenticationAlert(true)
                    })
                }
                
            } 
        } else {
            if(principal) {
                attributeList=getAttributeList();                
                setSessionAuthenticated(true)
                testAttributes({ principal: principal, select: attributeList}).then(result=>{
                    setAttributeResult(result)                            
                }).catch(error=>{
                    setUsedHelperTextPrincipal(<FormattedMessage defaultMessage="Tuntematon tilaaja" />)
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
                {authenticationAlert&&<Alert severity="error">This is an error Alert.</Alert>}
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
                    error={!isValid}
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
                                aria-label="toggle clientSecret visibility"
                                onClick={handleClickShowClientSecret}
                                edge="end"
                            >
                                {showClientSecret ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                            </InputAdornment>
                        ),
                        autoComplete: "off",
                    }}
                    error={!isValid}
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
                    error={!isValid}
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
                                                        {attributes.filter(attrib=>attrib.content!)
                                                        .map((attrib) => {
                                                            var value="";
                                                            var key=attrib.content?.split(".",1)[0]||attrib.content||""
                                                            if(attrib.content?.includes(".")) {                      
                                                                
                                                                if(attrib.content?.split(".",2)[1]) {
                                                                    var key2=attrib.content?.split(".",2)[1]
                                                                    if(attributeResult[key]&&key2) {
                                                                        value=(attributeResult[key])[key2]
                                                                    } 
                                                                }
                                                                                                 
                                                                
                                                            } else {
                                                                if(attrib.content&&attributeResult[attrib.content]) {
                                                                    value=attributeResult[attrib.content];
                                                                }
                                                                
                                                            }
                                                            
                                                            if(attrib) {
                                                                const id = `attribuutti.${attrib.content}`;
                                                                const label = id in intl.messages ? { id } : undefined;
                                                                
                                                                
                                                                return (<TableRow key={attrib.content}>
                                                                            <TableCell component="th" scope="row">
                                                                            <span>{label ? <FormattedMessage {...label} /> : attrib.content}</span>
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
            PERUUTA
          </Button>
          <Button onClick={()=>onUpdate()} autoFocus>
            TESTAA
          </Button>
        </DialogActions>}
        {Object.keys(attributeResult).length>0&&<DialogActions>
          <Button onClick={()=>setOpen(false)} autoFocus>
            OK
          </Button>
        </DialogActions>}
      </Dialog>)
}