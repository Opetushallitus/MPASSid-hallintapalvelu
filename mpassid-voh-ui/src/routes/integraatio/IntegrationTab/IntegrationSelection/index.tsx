import { updateIntegration } from "@/api";
import type { Components } from "@/api";
import { useIntegrationsSpecSearchPageable } from "@/api";
import { roles } from "@/config";
import { TablePaginationWithRouterIntegration } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import TableHeaderCell from "@/utils/components/TableHeaderCell";
import { FormattedMessage } from "react-intl";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import { useSearchParams } from "react-router-dom";
import { ChangeEvent, useEffect, useState, Dispatch } from "react";
import RowsPerPage from "@/utils/components/RowsPerPage";
import SearchForm from "./../../../home/SearchForm";
import { usePaginationPage } from "@/utils/components/pagination";
import DialogTitle from "@mui/material/DialogTitle";
interface Props {
  integration: Components.Schemas.Integration;
  newIntegration?: Components.Schemas.Integration;
  setNewIntegration: Dispatch<Components.Schemas.Integration>
  setIntegration: Dispatch<Components.Schemas.Integration>
  activateAllServices: boolean
  setActivateAllServices: Dispatch<boolean>
}

const eqCheck = (integ1: Components.Schemas.Integration,integ2: Components.Schemas.Integration) =>  {
    const list1 = integ1.allowedIntegrations?.map(i=>i.id) || [];
    const list2 = integ2.allowedIntegrations?.map(i=>i.id) || [];
    return list1.length === list2.length&&[...list1].filter(id => list2.indexOf(id)>-1).length === list1.length;
}
export default function IntegrationSelection({ integration, newIntegration, setNewIntegration, setIntegration, activateAllServices, setActivateAllServices }: Props) {
  
  const { content, totalPages } = useIntegrationsSpecSearchPageable();
  const [, , { resetPage }] = usePaginationPage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  
  const snackbarLocation: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  } = {
    vertical: 'bottom',
    horizontal: 'right',
  }
  const [snackbarState, setSnackbarState] = useState<boolean>(false);
  
  useEffect(() => {
    if((integration !== undefined)&&(newIntegration?.id !== integration?.id)) {
      setNewIntegration(integration);
    }
  }, [integration,newIntegration,setNewIntegration,setActivateAllServices]);

  useEffect(() => {
    if(integration!==undefined&&newIntegration!==undefined&& eqCheck(integration,newIntegration)) {
      setSnackbarState(false);
    } else {
      setSnackbarState(true);
    }
  }, [integration,newIntegration,setSnackbarState]);

  useEffect(() => {
    if(newIntegration) {
      if(!activateAllServices&&(newIntegration.allowedIntegrations === undefined||newIntegration.allowedIntegrations.length===0)) {
        setSnackbarState(true);
      }
    }
    
  }, [activateAllServices,newIntegration,setSnackbarState,]);


  
  useEffect(() => {
    if((searchParams.get("rooli") ?? "")!=="set") {
      setSearchParams("rooli=set")
    }
  }, [integration,searchParams,setSearchParams]);

  const handleSwitchAllChange = (e: ChangeEvent<HTMLInputElement>) => {
    const copy = structuredClone(newIntegration)

    if(copy!==undefined) {
      if(!activateAllServices) {
        copy.allowedIntegrations = [];
      } else {
        copy.allowedIntegrations = structuredClone(integration.allowedIntegrations);
      }
  
      setNewIntegration(copy);
      setActivateAllServices(!activateAllServices);
    }
    
  };

  const copyFormDataToURLSearchParams =
  (formData: FormData) => (searchParams: URLSearchParams) => {
    (formData as URLSearchParams).forEach((value, key) => {
      if (value) {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    });

    return searchParams;
  };

  function handleSearch(formData: FormData) {
    const copy = copyFormDataToURLSearchParams(formData);
    setSearchParams((searchParams) => resetPage(copy(searchParams)));
  }

  const saveIntegrations = async () => {
    if(newIntegration!==undefined) {
      const id = newIntegration.id!;
      const updateResponse = await updateIntegration({ id },newIntegration);
      setIntegration(updateResponse);
      setOpen(true)
    }
  };

  const clearIntegrations = () => {
    setNewIntegration(integration);
    setSnackbarState(false);
    if(integration?.allowedIntegrations === undefined || integration?.allowedIntegrations?.length===0) {
      setActivateAllServices(true);
    } else {
      setActivateAllServices(false);
    }
    
  };

  const removeIntegrations = () => {
    const copy = structuredClone(newIntegration)
    if(copy!==undefined) {
      copy.allowedIntegrations=[];
      setNewIntegration(copy);
      setSnackbarState(true);
    }
  };

  const handleSwitchChange = (row: Components.Schemas.Integration) => {
      
    const copy = structuredClone(newIntegration)

    if(copy.allowedIntegrations === undefined) {
      copy.allowedIntegrations = [];
    }
  
    const index:number|undefined = copy.allowedIntegrations?.map((i:Components.Schemas.Integration)=>i.id).indexOf(row.id);
    if(index!=undefined) {
      if (index > -1) {
        copy?.allowedIntegrations?.splice(index, 1);
      } else {
        const newServiceIntgeration:Components.Schemas.Integration={};
        newServiceIntgeration.id=row.id;
        copy?.allowedIntegrations?.push(newServiceIntgeration);
      }  
      setNewIntegration(copy);    
    }
      
  };

    return (
      <>
            <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Palvelun tarjoajat" />
              
            </Typography>
            
            <Box display="flex" justifyContent="center" mt={3}> 
            
            <FormControlLabel sx={{ marginRight: "auto" }} control={<Switch checked={activateAllServices} onChange={e=>handleSwitchAllChange(e)}/>} label="Salli kaikki palvelut" />
                  <Button aria-label="delete" 
                          sx={{ marginLeft: "auto" }}
                          variant="text"
                          startIcon={<DeleteIcon />} 
                          onClick={()=>removeIntegrations()} >
                    Poista valinnat
                  </Button>
                  
            </Box>
            {(activateAllServices)&&<>
                                    <Alert severity="warning" sx={{ width: '60%' }}>
                                              <FormattedMessage defaultMessage="Yksittäisten palvelujen tilaa ei voi muuttaa, kun kaikki palvelut ovat sallittuja" />
                                    </Alert>
                                    <br></br>
                                    </>}
             
              <Stack direction="row" alignItems="center">
                <Box flex={1} sx={{ mr: 2 }}>
                  <SearchForm formData={searchParams} onSearch={handleSearch} />
                </Box>
                <RowsPerPage />
              </Stack>
              <Table component="div">
                  <TableHead component="div">
                    <TableRow component="div">
                        <TableHeaderCell sort="id" component="div">
                            <FormattedMessage defaultMessage="Tunniste" />
                        </TableHeaderCell>
                        <TableHeaderCell
                        sort={[ "referenceIntegration"]}
                        component="div">
                            <FormattedMessage defaultMessage="Sallittu palvelu" />
                        </TableHeaderCell>
                        <TableHeaderCell
                        sort={[
                            "configurationEntity.set.name"
                        ]}
                        component="div">
                            <FormattedMessage defaultMessage="Palvelu" />
                        </TableHeaderCell>
                        <TableHeaderCell sort="organization.name" component="div">
                            <FormattedMessage defaultMessage="Organisaatio" />
                        </TableHeaderCell>
                        <TableHeaderCell sort="organization.edited" component="div">
                            <FormattedMessage defaultMessage="Muokattu" />
                        </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody component="div">
                      {content?.map((rowData, index) => (
                          <Row key={index} handleSwitch={handleSwitchChange} activateAllServices={activateAllServices} row={rowData } newIntegration={newIntegration} />
                      ))}
                  </TableBody>
              </Table>
              {content?.length ? (
                  <TablePaginationWithRouterIntegration count={totalPages} />
              ) : (
                  <Box display="flex" justifyContent="center" mt={3}>
                  <Secondary>
                      <FormattedMessage
                      defaultMessage={`Valitsemillasi hakuehdoilla ei löytynyt yhtään {type, select,
                          integration {integraatiota}
                          other {tietoa}
                      }.`}
                      values={{ type: "integration" }}
                      />
                  </Secondary>
                  </Box>
              )}

              <Dialog
                open={open}
                onClose={()=>setOpen(false)}
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
                  <Button onClick={()=>setOpen(false)} autoFocus>
                    OK
                  </Button>
                </DialogActions>
              </Dialog>
              <Snackbar
                  open={snackbarState}
                  anchorOrigin={snackbarLocation}>
                  
                    <Box boxShadow={5} sx={{ width: '100%', backgroundColor: 'white', border: '1px line grey' }} >
                    <Container maxWidth="sm">
                    
                        <Typography variant="h6" component="h2" sx={{ my: 2, marginLeft: 'auto', marginRight: 'auto', marginTop: '6%' }}>
                            <FormattedMessage defaultMessage="Tallenna muutokset" />
                        </Typography>
        
                        <Box display="flex" justifyContent="center" mt={2}> 
                            <Button onClick={clearIntegrations} sx={{ marginRight: "auto" }}><FormattedMessage defaultMessage="Peruuta" /></Button> 
                            <Button onClick={saveIntegrations} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Tallenna" /></Button> 
                        </Box>
                        <br></br>
                      </Container>
                    </Box>
                   
              </Snackbar>

      </>
    );
  

  
}

export const getRole = (row: Components.Schemas.Integration) =>
  roles.find((role) => row.configurationEntity?.[role])!;

  
interface RowListProps {
  row:Components.Schemas.Integration, 
  newIntegration:Components.Schemas.Integration|undefined,
  activateAllServices: boolean,
  handleSwitch: (sp: Components.Schemas.Integration) => void,
} 

function Row(props:RowListProps) {
    
  if(props.newIntegration==undefined) {
    return (<></>);
  }
  
  const configurationEntity = props.row.configurationEntity;

  return (
    <TableRow
      hover
      component="div"
      sx={{ textDecorationLine: "inherit" }}
    >
      <TableCell component="div">{props.row.id}</TableCell>
      <TableCell component="div">
        <SallittuPalvelu row={props.row} newIntegration={props.newIntegration} activateAllServices={props.activateAllServices} handleSwitch={props.handleSwitch} />
      </TableCell>
      <TableCell component="div">
        <PalveluRyhmaContent {...configurationEntity} />
      </TableCell>
      <TableCell component="div">
        <Stack>
          {props.row.organization?.name}
        </Stack>
      </TableCell>
      <TableCell component="div">
        <Stack>
          TBD!
        </Stack>
      </TableCell>
    </TableRow>
  );
};
function PalveluRyhmaContent(props: Components.Schemas.ConfigurationEntity) {
    
  const ryhmaYks=props.set?.name || "Ei määritelty!";
  return (
    <>{ryhmaYks}</>    
  );
}

function SallittuPalvelu(props:RowListProps) {
    
  const allowed=props.newIntegration?.allowedIntegrations?.find(i => i.id === props.row.id);
  let checked=false;
  let switchOpacity=1;
  if(allowed) {
    checked=true;
  }
  if(props.activateAllServices) {
    checked=props.activateAllServices;
    switchOpacity=0.4
  }
  
  return(
      <Switch sx={{ opacity: switchOpacity}} disabled={props.activateAllServices} checked={checked} onChange={()=>props.handleSwitch(props.row)}/>
  );
  
};
