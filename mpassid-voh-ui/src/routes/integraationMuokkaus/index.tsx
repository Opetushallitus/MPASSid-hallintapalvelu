import { inactivateIntegration, type Components, uploadLogo, uploadSamlMetadata, createIntegrationRaw, updateIntegrationRaw, testAttributesAuthorization, useDataUserInterfaceConfigurationRawSafe } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import HelpLinkButton from "@/utils/components/HelpLinkButton";
import PageHeader from "@/utils/components/PageHeader";
import Suspense from "@/utils/components/Suspense";
import { Box, Button, Container, Paper, Snackbar, TableContainer, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, Alert, AlertTitle, Link as MuiLink, CircularProgress } from '@mui/material';
import { useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from 'react-intl';
import { Link, useNavigate, useParams } from "react-router-dom";
import IntegrationDetails from "./IntegrationDetails";
import MpassSymboliIcon from "@/utils/components/MpassSymboliIcon";
import { useMe } from "@/api/käyttöoikeus";
import type { UiConfiguration } from '../../config';
import { tallentajaOphGroup, dataConfiguration } from '../../config';
import RuleIcon from '@mui/icons-material/Rule';
import AttributeTest from "./AttributeTest";
import DeleteIcon from '@mui/icons-material/Delete';
import { devLog } from "@/utils/devLog";
import { cloneDeep, clone } from 'lodash';
import { integrationTypesDefault } from '@/config';

export default function IntegraatioMuokkaus() {
  const { type } = useParams();
  const { id } = useParams();
  const [saveDialogState, setSaveDialogState] = useState(true);
  const [canSave, setCanSave] = useState(false);
  const [azureTestDone, setAzureTestDone] = useState(true);
  const [newIntegration, setNewIntegration] = useState<Components.Schemas.Integration|undefined>();
  const navigate = useNavigate();
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [openAttributeTest, setOpenAttributeTest] = useState(false);
  const [openIntegrationError, setOpenIntegrationError] = useState(false);
  const [openIntegrationErrorText, setOpenIntegrationErrorText] = useState<string>('');
  
  const [isConfirmed, setConfirmed] = useState(false);
  const [isDisabled, setDisabled] = useState(false);
  const me = useMe();
  const [groups, setGroups] = useState<string[]>();
  const [openNotice, setOpenNotice] = useState(false);
  const [logo, setLogo] = useState<Blob>();
  const [ metadataFile, setMetadataFile ] = useState<File[]>([]);
  const result = useRef<Components.Schemas.Integration>({});
  const [loading, setLoading] = useState<boolean>(false);
  const intl = useIntl();
  const [uiConfiguration, setUiConfiguration] = useState<UiConfiguration[]>([]);
  const [ uiError, uiConfig ] = useDataUserInterfaceConfigurationRawSafe();
  const deploymentPhase = useRef<number>(-5);
  

  useEffect(() => {
    if(me?.groups) {
      setGroups(me.groups)
    }
  }, [me]);

  useEffect(() => {
    if(uiConfig&&uiConfig.status===200) {
      //Note: Update to user uiconfig.data when backend supports
      //setUiConfiguration(uiConfig.data)

      setUiConfiguration(dataConfiguration)
    } else {
      setUiConfiguration(dataConfiguration)
    }
  }, [uiConfig,uiError]);

  var oid:string = newIntegration?.organization?.oid || "";
  var environment:number = newIntegration?.deploymentPhase || 0;

  const snackbarLocation: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  } = {
    vertical: 'bottom',
    horizontal: 'right',
  }

  const getErrorId = () => {
    
    const id = openIntegrationErrorText;
    return openIntegrationErrorText in intl.messages ? { id: id } : undefined;
    
  }

  const closeNotice = () => {
      setOpenNotice(false)
      setOpenConfirmation(false);
      setSaveDialogState(false);  

      if(isDisabled) {
        setDisabled(false)
        navigate("/", { state: id })
      } else {
        navigate(`/integraatio/${result.current.id}`, { state: result.current })
      }
      
  };

  const closeErrorNotice = () => {
    setOpenNotice(false)
    setOpenConfirmation(false);
    setSaveDialogState(true); 
    setOpenIntegrationError(false)
    
};

  const writeAccess = () => {

    devLog("DEBUG","writeAccess (type)",newIntegration?.configurationEntity?.idp?.type)
    devLog("DEBUG","writeAccess (oid)",newIntegration?.organization?.oid)
    devLog("DEBUG","writeAccess (groups)",groups)
    //if((newIntegration?.configurationEntity?.idp?.type === "azure" ||  newIntegration?.configurationEntity?.idp?.type === "wilma" ||  newIntegration?.configurationEntity?.idp?.type === "opinsys") && newIntegration.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+newIntegration.organization.oid)||groups?.includes(tallentajaOphGroup))) {
    if((newIntegration?.configurationEntity?.idp?.type && integrationTypesDefault.typesOKJ.includes(newIntegration.configurationEntity.idp.type)) && newIntegration.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+newIntegration.organization.oid))) {
      return true;
    } else {
      if((newIntegration?.configurationEntity?.sp?.type === "saml" ||  newIntegration?.configurationEntity?.sp?.type === "oidc") && newIntegration.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+newIntegration.organization.oid)||groups?.includes("APP_MPASSID_PALVELU_TALLENTAJA_"+newIntegration.organization.oid))) {
        return true
      }
    }
    
    return false;
  }

  const isEntraId = () => {
    
    if(type==='azure') {
      return true;
    }
    return false;
  }
  
  const saveIntegration = async (event:any) => {
    
    if(writeAccess()) {
      var catchError=false
      if(newIntegration!==undefined) {
        if(!isConfirmed&&!openConfirmation) {
          setOpenConfirmation(true);
        } else {
          const id = newIntegration.id!;
          if(isDisabled) {
            result.current = await inactivateIntegration({ id });
          } else {            
            newIntegration.permissions?.forEach((permission)=>{
              delete permission.lastUpdatedOn;
            })
            if(newIntegration?.configurationEntity&&newIntegration?.configurationEntity.attributes&&newIntegration?.configurationEntity.attributes.length>0) {
              newIntegration.configurationEntity.attributes=newIntegration.configurationEntity.attributes.filter(a=>!(a.content===''&&a.type==='user'))
            }
            
            try {
              setLoading(true)
              if(id===0) {
                result.current = (await createIntegrationRaw({},newIntegration)).data;   
              } else {
                const updateIntegration = cloneDeep(newIntegration);
                if(newIntegration.integrationSets&&newIntegration.integrationSets.length>0) {
                  updateIntegration.integrationSets = newIntegration.integrationSets.map(i=> { return { id: i.id}})
                }
                if(deploymentPhase.current>=0) {
                  updateIntegration.deploymentPhase=deploymentPhase.current;
                }
                result.current = (await updateIntegrationRaw({ id },updateIntegration)).data;                
              }
              devLog("DEBUG","Integration save result",result.current)
              if(logo){
                const formData = new FormData();
                formData.append("file", logo);
                const logoId:number = result.current.id||0;
                if(logoId!==0) {
                  const logoResult= await uploadLogo({ id: logoId },formData as any);
                  if(result.current.configurationEntity?.idp) {
                    result.current.configurationEntity.idp.logoUrl=logoResult
                  }                
                } 
              }
              if(metadataFile.length===1){
                const formData = new FormData();
                formData.append("file", metadataFile[0]);
                const metadataId:number = result.current.id||0;                
                const metadataResult= await uploadSamlMetadata({ id: metadataId },formData as any);
                
                if(result.current.configurationEntity?.idp) {
                  result.current=metadataResult;
                }
              }
              setLoading(false)
            } catch (error:any) {   
              setLoading(false)           
              devLog('DEBUG','Integration error data:', error?.response?.data);
              devLog('DEBUG','Integration error status:', error?.response?.status);
              if(error?.response?.status===409) {
                setOpenIntegrationErrorText(error?.response?.data?.message)
              } else {
                setOpenIntegrationErrorText('')
              }
              
              catchError=true;
              
            }
            
          }
          if(catchError) {
            setOpenIntegrationError(true);
            setOpenConfirmation(false);
          } else {
            setOpenConfirmation(false);
            setOpenIntegrationErrorText('')
            setOpenNotice(true);
          }
          
        }
      } 
    } 

  }

  const testAzureAccess = () => {
    
    if (!azureTestDone&&openConfirmation&&newIntegration?.configurationEntity&&newIntegration?.configurationEntity.attributes&&newIntegration.configurationEntity.idp?.type==='azure') {
      const clientId=newIntegration.configurationEntity.attributes?.find(a=>a.name==='clientId')?.content
      const clientKey=newIntegration.configurationEntity.attributes?.find(a=>a.name==='clientKey')?.content
      if(clientKey !== undefined && !clientKey.includes("***") && id !== undefined) {
        setAzureTestDone(true)
        const authRequest:Components.Schemas.AttributeTestAuthorizationRequestBody={};
                    authRequest.id=parseInt(id);
                    if(id!=='0'&&newIntegration.configurationEntity.attributes.find(a=>a.name==='tenantId'&&a.type==='data')) {
                      authRequest.tenantId=newIntegration.configurationEntity.attributes.find(a=>a.name==='tenantId'&&a.type==='data')?.content
                    }
                    authRequest.clientId=clientId;
                    authRequest.clientSecret=clientKey;
                    
                    testAttributesAuthorization({},authRequest).then(result=>{ 
                          devLog("DEBUG","testAttributesAuthorization",result)                           
                        }).catch(error=>{
                          return (<Alert severity="error"><FormattedMessage defaultMessage="Testi valtuutus epäonnistui nykyisillä arvoilla!"/></Alert>)
                          
                        })
                    
        //return (<Alert severity="error">TBD: azure tunnisteiden toimivuus testi!!!</Alert>)
      } 
    } 
    return (<></>)
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <Box display="flex" alignItems="baseline">
          <PageHeader
            icon={<MpassSymboliIcon />}
            sx={{ flexGrow: 1 }}
          >
            {id==='0'&&<FormattedMessage defaultMessage="Uusi jäsen" values={{id: Number(id)}} />}
            {id!=='0'&&<FormattedMessage defaultMessage="Jäsenen {id} muokkaus" values={{id: Number(id)}} />}
          </PageHeader>
          <HelpLinkButton />
        </Box>
        
        <Suspense>
          <ErrorBoundary>
            <IntegrationDetails id={Number(id)} dataConfiguration={uiConfiguration} setSaveDialogState={setSaveDialogState} setCanSave={setCanSave} newIntegration={newIntegration} setNewIntegration={setNewIntegration} setLogo={setLogo} metadataFile={metadataFile} setMetadataFile={setMetadataFile} deploymentPhase={deploymentPhase}/>
          </ErrorBoundary>
          
        </Suspense>
        {newIntegration&&id!=='0'&&<Box >                            
                                          <IconButton 
                                              aria-label={intl.formatMessage({
                                                defaultMessage: "poista",
                                              })}
                                              onClick={()=>setDisabled(!isDisabled)}>
                                              <DeleteIcon />
                                          </IconButton>   
                                          <FormattedMessage defaultMessage="Poista jäsen" />
                                        </Box>}
        
      </TableContainer>
      {newIntegration&&<>
        <br/><br/><br/><br/>
      </>}
      {newIntegration&&<Snackbar
            open={saveDialogState}
            anchorOrigin={snackbarLocation}>
            
              <Box boxShadow={5} sx={{ width: '100%', backgroundColor: 'white', border: '1px line grey' }} >
              <Container maxWidth="sm">
              
                  <Typography variant="h6" component="h2" sx={{ my: 2, marginLeft: 'auto', marginRight: 'auto', marginTop: '6%' }}>
                      <FormattedMessage defaultMessage="Tallenna muutokset" />
                  </Typography>
                  
                  {isEntraId()&&canSave&&<><Button  variant="text" onClick={()=>setOpenAttributeTest(true)} startIcon={<RuleIcon />}>
                                      <FormattedMessage defaultMessage="Testaa attribuuttien oikeellisuus" />
                                  </Button></>}
                  
                  <Box display="flex" justifyContent="center" mt={2}> 
                      {id!=='0'&&<Button component={Link} to={`/integraatio/${id}`} sx={{ marginRight: "auto" }}><FormattedMessage defaultMessage="Peruuta" /></Button>}
                      {id==='0'&&<Button component={Link} to={`/`} sx={{ marginRight: "auto" }}><FormattedMessage defaultMessage="Peruuta" /></Button>} 
                     
                      {(!canSave&&!isDisabled)&&<Button sx={{ marginLeft: "auto" }} disabled><FormattedMessage defaultMessage="Tallenna" /></Button>}
                      {(canSave&&!isDisabled)&&<Button onClick={()=>{setAzureTestDone(false);setOpenConfirmation(true);setSaveDialogState(false)}} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Tallenna" /></Button>}
                      {(isDisabled)&&<Button onClick={()=>{setOpenConfirmation(true);setSaveDialogState(false)}} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Poista" /></Button>}                    
                  </Box>
                  <br></br>
                </Container>
              </Box>
              
        </Snackbar>}
        <Dialog
                open={openConfirmation}
                onClose={()=>setOpenConfirmation(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <DialogTitle id="alert-dialog-title">
                    {!isDisabled&&<FormattedMessage defaultMessage="Olet muuttamassa integraation tietoja" />}
                    {isDisabled&&<FormattedMessage defaultMessage="Olet poistamassa integraation tietoja" />}
                </DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description">
                    {testAzureAccess()}
                    
                  {!isDisabled&&<FormattedMessage defaultMessage="Haluatko varmasti tallentaa?" />}
                    {isDisabled&&<FormattedMessage defaultMessage="Haluatko varmasti poistaa?" />}
                  
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={()=>{setOpenConfirmation(false);setSaveDialogState(true);}} autoFocus>
                  <FormattedMessage defaultMessage="PERUUTA" />
                  </Button>
                  <Button onClick={saveIntegration} autoFocus disabled={loading}>
                    {!loading&&<FormattedMessage defaultMessage="OK" />}
                    {loading&&<CircularProgress />}
                  </Button>
                </DialogActions>
              </Dialog>
              <Dialog
                open={openNotice}
                onClose={()=>closeNotice()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <DialogTitle id="alert-dialog-title">
                    <FormattedMessage defaultMessage="Muutokset tallennettu onnistuneesti" />
                </DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description">
                  <FormattedMessage defaultMessage="Muutokset astuvat voimaan viimeistään 2 arkipäivän kuluessa muutoksen tallentamishetkestä." />
                  {newIntegration?.configurationEntity?.sp?.metadata?.client_secret&&!String(newIntegration.configurationEntity.sp.metadata.client_secret).includes("***")&&
                  newIntegration?.configurationEntity?.sp?.type === "oidc"&&<>
                    {newIntegration?.configurationEntity?.sp?.metadata?.client_secret&&<br />}
                    {newIntegration?.configurationEntity?.sp?.metadata?.client_secret&&<br />}
                    {newIntegration?.configurationEntity?.sp?.metadata?.client_secret&&<FormattedMessage defaultMessage="Muista tallentaa client_secret:" />}                  
                    {newIntegration?.configurationEntity?.sp?.metadata?.client_secret&&<br />}
                    {newIntegration?.configurationEntity?.sp?.metadata?.client_secret&&<FormattedMessage defaultMessage="client_secret: {secret}" values={{secret: String(newIntegration.configurationEntity.sp.metadata.client_secret)}} />}
                  </>}
                  
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={()=>closeNotice()} autoFocus>
                    OK
                  </Button>
                </DialogActions>
              </Dialog>                          
              <Dialog
                open={openIntegrationError}
                onClose={()=>closeErrorNotice()}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                
              <Alert severity="error"  onClose={()=>closeErrorNotice()}>
                        

                        
                        {openIntegrationErrorText&&openIntegrationErrorText!==''&&
                          
                          <FormattedMessage
                              defaultMessage="<title>Muutosten tallenus epäonnistui</title>{error} "
                              values={{
                                title: (chunks) => <AlertTitle>{chunks}</AlertTitle> ,
                                error: getErrorId() ? <FormattedMessage {...getErrorId()} /> : openIntegrationErrorText                 
                              }}
                            />}
                        {!(openIntegrationErrorText||openIntegrationErrorText!=='')&&
                          <FormattedMessage
                              defaultMessage="<title>Virhe</title>Ongelma näytettäessä tietoja. Ystävällisesti ole yhteydessä MPASSid-hallintapalvelun <link>ylläpitoon</link>."
                              values={{
                                title: (chunks) => <AlertTitle>{chunks}</AlertTitle>,
                                link: ENV.SUPPORT_URI
                                  ? (chunks) => (
                                      <MuiLink color="error" href={ENV.SUPPORT_URI}>
                                        {chunks}
                                      </MuiLink>
                                    )
                                  : (chunks) => chunks,
                              }}
                            />
                        }
                        
                        
              </Alert>
                  
              </Dialog>
              <AttributeTest id={id||'0'} dataConfiguration={uiConfiguration} open={openAttributeTest} setOpen={setOpenAttributeTest} tenantId={newIntegration?.configurationEntity?.attributes?.find(a=>a.type==='data'&&a.name==='tenantId')?.content } attributes={newIntegration?.configurationEntity?.attributes?.filter(a=>a.type==='user') || []} oid={oid} environment={environment} />
      </>
  );
}