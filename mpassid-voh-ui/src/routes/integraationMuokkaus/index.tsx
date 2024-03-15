import ErrorBoundary from "@/components/ErrorBoundary";
import HelpLinkButton from "@/utils/components/HelpLinkButton";
import PageHeader from "@/utils/components/PageHeader";
import Suspense from "@/utils/components/Suspense";
import { Box, Button, Container, Paper, Snackbar, TableContainer, Typography } from "@mui/material";
import { useLayoutEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useParams } from "react-router-dom";
import { useSessionStorage } from "usehooks-ts";
import IntegrationDetails from "./IntegrationDetails";
import MpassSymboliIcon from "@/utils/components/MpassSymboliIcon";
import { useMe } from "@/api/käyttöoikeus";

export default function IntegraatioMuokkaus() {
  const { id } = useParams();
  const [saveDialogState, setSaveDialogState] = useState(true);
  const [cannotSave, setCannotSave] = useState(true);
  const { groups } = useMe();

  const snackbarLocation: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  } = {
    vertical: 'bottom',
    horizontal: 'right',
  }
  
  const saveIntegration = async () => {
    console.log("SAVE")
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
            <IntegrationDetails id={Number(id)} setSaveDialogState={setSaveDialogState} setCannotSave={setCannotSave}/>
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
                      {!cannotSave&&<Button onClick={saveIntegration} sx={{ marginLeft: "auto" }} disabled><FormattedMessage defaultMessage="Tallenna" /></Button>}
                      {cannotSave&&<Button onClick={saveIntegration} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Tallenna" /></Button>}
                  </Box>
                  <br></br>
                </Container>
              </Box>
              
        </Snackbar>
      </>
  );
}