import { inactivateIntegration, type Components, type Paths, uploadLogo, uploadSamlMetadata, createIntegrationRaw, updateIntegrationRaw, testAttributesAuthorization, useDataUserInterfaceConfigurationRawSafe } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import HelpLinkButton from "@/utils/components/HelpLinkButton";
import PageHeader from "@/utils/components/PageHeader";
import Suspense from "@/utils/components/Suspense";
import { Box, Button, Container, Paper, Snackbar, TableContainer, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton, Alert, AlertTitle, Link as MuiLink, CircularProgress } from '@mui/material';
import { useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from 'react-intl';
import { Link, useNavigate, useParams } from "react-router-dom";
import IntegrationDetails from "./IntegrationDetails";
import MpassSymboliIcon from "@/utils/components/MpassSymboliIcon";
import { useMe } from "@/api/käyttöoikeus";
import type { UiConfiguration } from '../../config';
import { dataConfiguration } from '../../config';
import { withDevUiConfiguration } from './devUiConfiguration';
import RuleIcon from '@mui/icons-material/Rule';
import AttributeTest from "./AttributeTest";
import DeleteIcon from '@mui/icons-material/Delete';
import { createLogger, redactSecrets } from "@/utils/devLog";
import { cloneDeep } from 'lodash';
import { isAxiosError } from 'axios';
import { integrationTypesDefault } from '@/config';

const debugLog = createLogger("DEBUG");
const warnLog = createLogger("WARN");
const errorLog = createLogger("ERROR");

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
  
  const [isConfirmed] = useState(false);
  const [isDisabled, setDisabled] = useState(false);
  const me = useMe();
  // useMe suspends until loaded, so the groups are there on the first render.
  const groups = me?.groups;
  const [openNotice, setOpenNotice] = useState(false);
  const [logo, setLogo] = useState<Blob>();
  const [ metadataFile, setMetadataFile ] = useState<File[]>([]);
  const result = useRef<Components.Schemas.Integration>({});
  const [loading, setLoading] = useState<boolean>(false);
  const intl = useIntl();
  // Called for its side effect (loads the UI configuration); its data is
  // not used yet. Note: use uiConfig.data when the backend supports it.
  useDataUserInterfaceConfigurationRawSafe();
  const deploymentPhase = useRef<number>(-5);
  

  // The built-in configuration (+ the dev additions from localStorage),
  // read once.
  const uiConfiguration = useMemo<UiConfiguration[]>(() => withDevUiConfiguration(dataConfiguration), []);

  const oid:string = newIntegration?.organization?.oid || "";
  const environment:number = newIntegration?.deploymentPhase || 0;

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

    debugLog("writeAccess (type)",newIntegration?.configurationEntity?.idp?.type)
    debugLog("writeAccess (oid)",newIntegration?.organization?.oid)
    debugLog("writeAccess (groups)",groups)
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
  
  const saveIntegration = async (_event?:React.MouseEvent) => {
    
    if(writeAccess()) {
      let catchError=false
      if(newIntegration!==undefined) {
        if(!isConfirmed&&!openConfirmation) {
          setOpenConfirmation(true);
        } else {
          const id = newIntegration.id!;
          // The integration to save: a copy, the draft state is not modified.
          const integrationToSave = cloneDeep(newIntegration);
          if(isDisabled) {
            try {
              result.current = await inactivateIntegration({ id });
            } catch (error) {
              errorLog("saveIntegration (integraation poisto epäonnistui)", { id }, error);
              setOpenIntegrationErrorText('')
              catchError=true;
            }
          } else {            
            integrationToSave.permissions?.forEach((permission)=>{
              delete permission.lastUpdatedOn;
            })
            if(integrationToSave.configurationEntity&&integrationToSave.configurationEntity.attributes&&integrationToSave.configurationEntity.attributes.length>0) {
              integrationToSave.configurationEntity.attributes=integrationToSave.configurationEntity.attributes.filter(a=>!(a.content===''&&a.type==='user'))
            }
            
            try {
              setLoading(true)
              if(id===0) {
                result.current = (await createIntegrationRaw({},integrationToSave)).data;   
              } else {
                const updateIntegration = integrationToSave;
                if(integrationToSave.integrationSets&&integrationToSave.integrationSets.length>0) {
                  updateIntegration.integrationSets = integrationToSave.integrationSets.map(i=> { return { id: i.id}})
                }
                if(deploymentPhase.current>=0) {
                  updateIntegration.deploymentPhase=deploymentPhase.current;
                }
                result.current = (await updateIntegrationRaw({ id },updateIntegration)).data;                
              }
              debugLog("Integration save result",redactSecrets(result.current))
              if(logo){
                const formData = new FormData();
                formData.append("file", logo);
                const logoId:number = result.current.id||0;
                if(logoId!==0) {
                  // Multipart body: the generated type models the form field, not FormData.
                  const logoResult= await uploadLogo({ id: logoId },formData as unknown as Paths.UploadLogo.RequestBody);
                  if(result.current.configurationEntity?.idp) {
                    result.current.configurationEntity.idp.logoUrl=logoResult
                  }                
                } 
              }
              if(metadataFile.length===1){
                const formData = new FormData();
                formData.append("file", metadataFile[0]);
                const metadataId:number = result.current.id||0;                
                // Multipart body: the generated type models the form field, not FormData.
                const metadataResult= await uploadSamlMetadata({ id: metadataId },formData as unknown as Paths.UploadSAMLMetadata.RequestBody);
                
                if(result.current.configurationEntity?.idp) {
                  result.current=metadataResult;
                }
              }
              setLoading(false)
            } catch (error) {   
              setLoading(false)           
              const response = isAxiosError<{ message?: string }>(error) ? error.response : undefined
              errorLog("saveIntegration (integraation tallennus epäonnistui)",
                { id, status: response?.status, data: response?.data }, error);
              if(response?.status===409) {
                setOpenIntegrationErrorText(response?.data?.message ?? '')
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
                    // The backend reads the tenant id from the saved integration.
                    authRequest.id=parseInt(id);
                    authRequest.clientId=clientId;
                    authRequest.clientSecret=clientKey;
                    
                    testAttributesAuthorization({},authRequest).then(result=>{ 
                          debugLog("testAttributesAuthorization",redactSecrets(result))
                          if(result!==true) {
                            warnLog("testAzureAccess (testivaltuutus ei onnistunut)", result)
                          }
                        }).catch(error=>{
                          // Huom: aiempi versio palautti tästä <Alert>-elementin, joka ei
                          // koskaan renderöitynyt (callback ratkeaa renderin jälkeen).
                          warnLog("testAzureAccess (testivaltuutus epäonnistui)", error)
                        })
                    
        //return (<Alert severity="error">TBD: azure tunnisteiden toimivuus testi!!!</Alert>)
      } 
    } 
    return (<></>)
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <Box sx={{ display: "flex", alignItems: "baseline" }}>
          <PageHeader
            icon={<MpassSymboliIcon />}
            sx={{ flexGrow: 1 }}
          >
            {id==='0'&&<FormattedMessage defaultMessage="Uusi jäsen" />}
            {id!=='0'&&<FormattedMessage defaultMessage="Jäsenen {id} muokkaus" values={{id: Number(id)}} />}
          </PageHeader>
          <HelpLinkButton />
        </Box>
        
        <Suspense>
          <ErrorBoundary>
            <IntegrationDetails id={Number(id)} dataConfiguration={uiConfiguration} setSaveDialogState={setSaveDialogState} setCanSave={setCanSave} newIntegration={newIntegration} setNewIntegration={setNewIntegration} setLogo={setLogo} metadataFile={metadataFile} setMetadataFile={setMetadataFile} deploymentPhaseRef={deploymentPhase}/>
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
            
              <Box sx={{ boxShadow: 5, width: '100%', backgroundColor: 'white', border: '1px line grey' }} >
              <Container maxWidth="sm">
              
                  <Typography variant="h6" component="h2" sx={{ my: 2, marginLeft: 'auto', marginRight: 'auto', marginTop: '6%' }}>
                      <FormattedMessage defaultMessage="Tallenna muutokset" />
                  </Typography>
                  
                  {isEntraId()&&(canSave||id!=='0')&&<><Button  variant="text" onClick={()=>setOpenAttributeTest(true)} startIcon={<RuleIcon />}>
                                      <FormattedMessage defaultMessage="Testaa attribuuttien oikeellisuus" />
                                  </Button></>}
                  
                  <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}> 
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
              <AttributeTest id={id||'0'} dataConfiguration={uiConfiguration} open={openAttributeTest} setOpen={setOpenAttributeTest} attributes={newIntegration?.configurationEntity?.attributes?.filter(a=>a.type==='user') || []} oid={oid} environment={environment} />
      </>
  );
}