import { Components, testAttributes, testAttributesAuthorization } from '@/api';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material';
import { Dispatch, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';


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
    const [defaultValue, setDefaultValue] = useState("");
    const [usedHelperText, setUsedHelperText] = useState<JSX.Element>(<></>);
    const [attributeResult, setAttributeResult] = useState<any>({});
    const pricipalRef = useRef<HTMLFormElement>(null);
    const clientIdRef = useRef<HTMLFormElement>(null);
    const clientSecretRef = useRef<HTMLFormElement>(null);
    
    useEffect(() => {
        if(!open){
            setAttributeResult({})
        }
      }, [open]);

    const onlyUnique = (value: string, index: number, array: string[]) => {
        //function onlyUnique(value:string, index:number, array:Array<string>) {
        return array.indexOf(value) === index;
    }

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
        if(!sessionAuthenticated) {
            if(pricipalRef?.current?.value&&clientIdRef?.current?.value&&clientSecretRef?.current?.value) {
                attributeList=getAttributeList()||[];
                const principal=pricipalRef.current.value||"";
                if(!sessionAuthenticated){
                    const authRequest:Components.Schemas.AttributeTestAuthorizationRequestBody={};
                    authRequest.id=parseInt(id);
                    authRequest.clientId=clientIdRef.current.value;
                    authRequest.clientSecret=clientSecretRef.current.value;
                    
                    testAttributesAuthorization({},authRequest).then(result=>{ 
                        testAttributes({ principal: principal, select: attributeList}).then(result=>{
                            setAttributeResult(result)
                            setSessionAuthenticated(true)
                        }).catch(error=>{
                            setAttributeResult({})
                            setSessionAuthenticated(true)
                        })
                    }).catch(error=>{
                        setSessionAuthenticated(false)
                        alert("Auth failed!!!")
                    })
                }
                
            } else {
                setIsValid(false)
                setUsedHelperText(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            }
        } else {
            if(pricipalRef?.current?.value) {
                attributeList=getAttributeList();                
                const principal=pricipalRef.current.value||"";
                testAttributes({ principal: principal, select: attributeList}).then(result=>{
                    setAttributeResult(result)
                    setSessionAuthenticated(true)
                }).catch(error=>{
                    setAttributeResult({})
                    setSessionAuthenticated(true)
                })
                //Jos failaa, niin alertti ja setSessionAuthenticated(false)
            } else {
                setIsValid(false)
                setUsedHelperText(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            }
        }
        

    }
    const updatePrincipalFormValue = () => {
        
        if((!pricipalRef.current?.value||pricipalRef.current.value==="")) {
            setUsedHelperText(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValid(false)
        } else {
            setIsValid(true)               
            setUsedHelperText(<></>)
        }
          
      };
    
      const updateClientIdFormValue = () => {
        
        if((!clientIdRef.current?.value||clientIdRef.current.value==="")) {
            setUsedHelperText(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValid(false)
        } else {
            setIsValid(true)               
            setUsedHelperText(<></>)
        }
          
      };

      const updateClientSecretFormValue = () => {
        
        if((!clientSecretRef.current?.value||clientSecretRef.current.value==="")) {
            setUsedHelperText(<FormattedMessage defaultMessage="Pakollinen kenttä" />)
            setIsValid(false)
        } else {
            setIsValid(true)               
            setUsedHelperText(<></>)
        }
          
        
      };

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
                    defaultValue={defaultValue}
                    fullWidth
                    error={!isValid}
                    helperText={usedHelperText}
                    inputProps={{
                        ref: clientIdRef,
                        autoComplete: "off",
                    }}
                    onChange={updateClientIdFormValue}
                />
                <TextField
                    sx={{ width: '100%'}}
                    variant="standard"
                    label={intl.formatMessage({
                        defaultMessage: "Client Key"},
                        {} 
                    )}
                    placeholder={intl.formatMessage({
                        defaultMessage: "Client Key"},
                        {} 
                    )}
                    defaultValue={defaultValue}
                    fullWidth
                    error={!isValid}
                    helperText={usedHelperText}
                    inputProps={{
                        ref: clientSecretRef,
                        autoComplete: "off",
                    }}
                    onChange={updateClientSecretFormValue}
                />
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
                    defaultValue={defaultValue}
                    fullWidth
                    error={!isValid}
                    helperText={usedHelperText}
                    inputProps={{
                        ref: pricipalRef,
                        autoComplete: "off",
                    }}
                    onChange={updatePrincipalFormValue}
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
                                                        {attributes.filter(attrib=>attrib.content!).map((attrib) => {
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
                                                                return (<TableRow key={attrib.content}>
                                                                            <TableCell component="th" scope="row">
                                                                                {attrib.content}
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
