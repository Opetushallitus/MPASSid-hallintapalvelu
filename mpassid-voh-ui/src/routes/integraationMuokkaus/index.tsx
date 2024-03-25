import { updateIntegration, type Components } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import HelpLinkButton from "@/utils/components/HelpLinkButton";
import PageHeader from "@/utils/components/PageHeader";
import Suspense from "@/utils/components/Suspense";
import { Box, Button, Container, Paper, Snackbar, TableContainer, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { useLayoutEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSessionStorage } from "usehooks-ts";
import IntegrationDetails from "./IntegrationDetails";
import MpassSymboliIcon from "@/utils/components/MpassSymboliIcon";
import { useMe } from "@/api/käyttöoikeus";
import { openIntegrationsSessionStorageKey, tallentajaOphGroup } from '../../config';

export default function IntegraatioMuokkaus() {
  const { id } = useParams();
  const [saveDialogState, setSaveDialogState] = useState(true);
  const [cannotSave, setCannotSave] = useState(true);
  const [newIntegration, setNewIntegration] = useState<Components.Schemas.Integration|undefined>();
  const { groups } = useMe();
  const navigate = useNavigate();
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [isConfirmed, setConfirmed] = useState(false);
  const [tabs, setValue] = useSessionStorage<string[]>(
    openIntegrationsSessionStorageKey,
    []
  );
  
    
  
  
  const snackbarLocation: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  } = {
    vertical: 'bottom',
    horizontal: 'right',
  }

  const removeTab = (id:any) => {
    
    if(writeAccess()) {
      if (tabs.includes(id)) {
        const index = tabs.indexOf(id);
        setValue([...tabs.splice(index,1)]);
      }
    }
  }

  const writeAccess = () => {
    
    if(newIntegration?.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+newIntegration?.organization?.oid)||groups?.includes(tallentajaOphGroup))) {
      return true;
    }
    return false;
  }
  
  const saveIntegration = async () => {
    if(writeAccess()) {
      console.log("SAVE: ",newIntegration)
      if(newIntegration!==undefined) {
        if(!isConfirmed&&!openConfirmation) {
          setOpenConfirmation(true);
        } else {
          const id = newIntegration.id!;
          newIntegration.permissions?.forEach((permission)=>{
            delete permission.lastUpdatedOn;
          })
          const updateResponse = await updateIntegration({ id },newIntegration);
          removeTab(id);
          setOpenConfirmation(false);
        }
      } 
    } else {
      console.log("SAVE: Not write access!",newIntegration)
    }

    
    setSaveDialogState(false)
  
    navigate(`/integraatio/${id}`)
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <Box display="flex" alignItems="baseline">
          <PageHeader
            icon={<MpassSymboliIcon />}
            sx={{ flexGrow: 1 }}
          >
            {id==="0"&&<FormattedMessage defaultMessage="Uusi jäsen" />}
            {id!=="0"&&<FormattedMessage defaultMessage="Jäsenen {id} muokkaus" values={{id: Number(id)}} />}
          </PageHeader>
          <HelpLinkButton />
        </Box>
        
        <Suspense>
          <ErrorBoundary>
            <IntegrationDetails id={Number(id)} setSaveDialogState={setSaveDialogState} setCannotSave={setCannotSave} setNewIntegration={setNewIntegration}/>
          </ErrorBoundary>
          
        </Suspense>
      </TableContainer>
      <Snackbar
            open={saveDialogState}
            anchorOrigin={snackbarLocation}>
            
              <Box boxShadow={5} sx={{ width: '100%', backgroundColor: 'white', border: '1px line grey' }} >
              <Container maxWidth="sm">
              
                  <Typography variant="h6" component="h2" sx={{ my: 2, marginLeft: 'auto', marginRight: 'auto', marginTop: '6%' }}>
                      <FormattedMessage defaultMessage="Tallenna muutokset" />
                  </Typography>
  
                  <Box display="flex" justifyContent="center" mt={2}> 
                      {id!=="0"&&<Button component={Link} to={`/integraatio/${id}`} sx={{ marginRight: "auto" }}><FormattedMessage defaultMessage="Peruuta" /></Button>}
                      {id==="0"&&<Button component={Link} to={`/`} sx={{ marginRight: "auto" }}><FormattedMessage defaultMessage="Peruuta" /></Button>} 
                      {!cannotSave&&<Button sx={{ marginLeft: "auto" }} disabled><FormattedMessage defaultMessage="Tallenna" /></Button>}
                      {cannotSave&&<Button onClick={()=>setOpenConfirmation(true)} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Tallenna" /></Button>}
                  </Box>
                  <br></br>
                </Container>
              </Box>
              
        </Snackbar>
        <Dialog
                open={openConfirmation}
                onClose={()=>setOpenConfirmation(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <DialogTitle id="alert-dialog-title">
                    <FormattedMessage defaultMessage="Olet muuttamassa integraation tietoja" />
                </DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description">
                  <FormattedMessage defaultMessage="Haluatko varmasti tallentaa?" />
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
      </>
  );
}