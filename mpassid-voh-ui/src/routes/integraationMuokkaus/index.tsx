import { updateIntegration, inactivateIntegration, type Components } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import HelpLinkButton from "@/utils/components/HelpLinkButton";
import PageHeader from "@/utils/components/PageHeader";
import Suspense from "@/utils/components/Suspense";
import { Box, Button, Container, Paper, Snackbar, TableContainer, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, IconButton } from '@mui/material';
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useNavigate, useParams } from "react-router-dom";
import IntegrationDetails from "./IntegrationDetails";
import MpassSymboliIcon from "@/utils/components/MpassSymboliIcon";
import { useMe } from "@/api/käyttöoikeus";
import { tallentajaOphGroup } from '../../config';
import RuleIcon from '@mui/icons-material/Rule';
import AttributeTest from "./AttributeTest";
import DeleteIcon from '@mui/icons-material/Delete';

export default function IntegraatioMuokkaus() {
  const { status } = useParams();
  const { type } = useParams();
  const { id } = useParams();
  const [saveDialogState, setSaveDialogState] = useState(true);
  const [canSave, setCanSave] = useState(false);
  const [newIntegration, setNewIntegration] = useState<Components.Schemas.Integration|undefined>();
  const navigate = useNavigate();
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [openAttributeTest, setOpenAttributeTest] = useState(false);
  const [isConfirmed, setConfirmed] = useState(false);
  const [isDisabled, setDisabled] = useState(false);
  const me = useMe();
  const [groups, setGroups] = useState<string[]>();
  const [openNotice, setOpenNotice] = useState(false);
  var result: Components.Schemas.Integration = {};

  useEffect(() => {
    if(me?.groups) {
      setGroups(me.groups)
    }
  }, [me]);

  var oid:string = newIntegration?.organization?.oid || "";
  var environment:number = newIntegration?.deploymentPhase || 0;

  const snackbarLocation: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  } = {
    vertical: 'bottom',
    horizontal: 'right',
  }

  const closeNotice = () => {
      setOpenNotice(false)
      setOpenConfirmation(false);
      setSaveDialogState(false)  
      if(isDisabled) {
        setDisabled(false)
        navigate("/", { state: id })
      } else {
        navigate(`/integraatio/${id}`, { state: result })
      }
      
  };

  const writeAccess = () => {
    
    if(newIntegration?.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+newIntegration?.organization?.oid)||groups?.includes(tallentajaOphGroup))) {
      return true;
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
      if(newIntegration!==undefined) {
        if(!isConfirmed&&!openConfirmation) {
          setOpenConfirmation(true);
        } else {
          const id = newIntegration.id!;
          if(isDisabled) {
            result = await inactivateIntegration({ id });
          } else {            
            newIntegration.permissions?.forEach((permission)=>{
              delete permission.lastUpdatedOn;
            })
            result = await updateIntegration({ id },newIntegration);  
          }
          
          setOpenConfirmation(false);
          setOpenNotice(true);
        }
      } 
    } 

  }

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <Box display="flex" alignItems="baseline">
          <PageHeader
            icon={<MpassSymboliIcon />}
            sx={{ flexGrow: 1 }}
          >
            <FormattedMessage defaultMessage="Jäsenen {id} muokkaus" values={{id: Number(id)}} />
          </PageHeader>
          <HelpLinkButton />
        </Box>
        
        <Suspense>
          <ErrorBoundary>
            <IntegrationDetails id={Number(id)} setSaveDialogState={setSaveDialogState} setCanSave={setCanSave} newIntegration={newIntegration} setNewIntegration={setNewIntegration}/>
          </ErrorBoundary>
          
        </Suspense>
        {newIntegration&&status!=='uusi'&&<Box >                            
                                          <IconButton aria-label="delete" onClick={()=>setDisabled(!isDisabled)}>
                                              <DeleteIcon />
                                          </IconButton>   
                                          <FormattedMessage defaultMessage="Poista jäsen" />
                                        </Box>}
        
      </TableContainer>
      {newIntegration&&<Snackbar
            open={saveDialogState}
            anchorOrigin={snackbarLocation}>
            
              <Box boxShadow={5} sx={{ width: '100%', backgroundColor: 'white', border: '1px line grey' }} >
              <Container maxWidth="sm">
              
                  <Typography variant="h6" component="h2" sx={{ my: 2, marginLeft: 'auto', marginRight: 'auto', marginTop: '6%' }}>
                      <FormattedMessage defaultMessage="Tallenna muutokset" />
                  </Typography>
                  {isEntraId()&&false&&<><IconButton size="large" color="primary" aria-label="rule-icon">
                      <RuleIcon />
                  </IconButton><FormattedMessage defaultMessage="Testaa attribuuttien oikeellisuus" /></>}
                  
                  {isEntraId()&&true&&<><Button  variant="text" onClick={()=>setOpenAttributeTest(true)} startIcon={<RuleIcon />}>
                  <FormattedMessage defaultMessage="Testaa attribuuttien oikeellisuus" />
                  </Button></>}
                  {isEntraId()&&false&&<><Button  size="small"  startIcon={<RuleIcon />}>
                  </Button><FormattedMessage defaultMessage="Testaa attribuuttien oikeellisuus" /></>}
                  <Box display="flex" justifyContent="center" mt={2}> 
                      {status!=="uusi"&&<Button component={Link} to={`/integraatio/${id}`} sx={{ marginRight: "auto" }}><FormattedMessage defaultMessage="Peruuta" /></Button>}
                      {status==="uusi"&&<Button component={Link} to={`/`} sx={{ marginRight: "auto" }}><FormattedMessage defaultMessage="Peruuta" /></Button>} 
                     
                      {(!canSave&&!isDisabled)&&<Button sx={{ marginLeft: "auto" }} disabled><FormattedMessage defaultMessage="Tallenna" /></Button>}
                      {(canSave&&!isDisabled)&&<Button onClick={()=>setOpenConfirmation(true)} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Tallenna" /></Button>}
                      {(isDisabled)&&<Button onClick={()=>setOpenConfirmation(true)} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Poista" /></Button>}
                      
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
                  {!isDisabled&&<FormattedMessage defaultMessage="Haluatko varmasti tallentaa?" />}
                    {isDisabled&&<FormattedMessage defaultMessage="Haluatko varmasti poistaa?" />}
                  
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={()=>setOpenConfirmation(false)} autoFocus>
                    PERUUTA
                  </Button>
                  <Button onClick={saveIntegration} autoFocus>
                    OK
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
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={()=>closeNotice()} autoFocus>
                    OK
                  </Button>
                </DialogActions>
              </Dialog>
              <AttributeTest id={id||'0'} open={openAttributeTest} setOpen={setOpenAttributeTest} attributes={newIntegration?.configurationEntity?.attributes?.filter(a=>a.type==='user') || []} oid={oid} environment={environment} />
      </>
  );
}