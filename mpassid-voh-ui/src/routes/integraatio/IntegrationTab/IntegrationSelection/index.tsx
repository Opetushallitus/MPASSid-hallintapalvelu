import { updateIntegration } from "@/api";
import type { Components } from "@/api";
import { useIntegrationsSpecSearchPageable } from "@/api";
import { useMe } from "@/api/käyttöoikeus";
import { roles, tallentajaOphGroup, mpassIdUserAttributeTestService } from "@/config";
import { TablePaginationWithRouterIntegration } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import TableHeaderCell from "@/utils/components/TableHeaderCell";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Divider,
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
import ServiceLinkButton from "@/utils/components/ServiceLinkButton";
import Suspense from "@/utils/components/Suspense";
interface Props {
  integration: Components.Schemas.Integration;
  newIntegration?: Components.Schemas.Integration;
  setNewIntegration: Dispatch<Components.Schemas.Integration>
  setIntegration: Dispatch<Components.Schemas.Integration>
  activateAllServices: boolean
  setActivateAllServices: Dispatch<boolean>
}

const eqCheck = (integ1: Components.Schemas.Integration,integ2: Components.Schemas.Integration) =>  {
    const list1 = integ1.permissions?.map(i=>i.to?.id) || [];
    const list2 = integ2.permissions?.map(i=>i.to?.id) || [];
    return list1.length === list2.length&&[...list1].filter(id => list2.indexOf(id)>-1).length === list1.length;
}
export default function IntegrationSelection({ integration, newIntegration, setNewIntegration, setIntegration, activateAllServices, setActivateAllServices }: Props) {
  
  const { content, totalPages } = useIntegrationsSpecSearchPageable();
  const [, , { resetPage }] = usePaginationPage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openNotice, setOpenNotice] = useState(false);
  const [openConfirmation, setOpenConfirmation] = useState(false);
  const [saveDialogState, setSaveDialogState] = useState(false);
  const { groups } = useMe();

  const snackbarLocation: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  } = {
    vertical: 'bottom',
    horizontal: 'right',
  }
    
  useEffect(() => {
    if(integration !== undefined) {
      setNewIntegration(integration);
    }
  }, [integration, setNewIntegration]);
  
  useEffect(() => {
    if((integration !== undefined)&&(newIntegration?.id !== integration?.id)) {
      setNewIntegration(integration);
      setSaveDialogState(false);
    }
  }, [integration,newIntegration,setNewIntegration,setSaveDialogState]);

  useEffect(() => {
    if(integration!==undefined&&newIntegration!==undefined&&eqCheck(integration,newIntegration)) {
      setSaveDialogState(false);
    } else {
      if(!openConfirmation&&!openNotice) {
        setSaveDialogState(true);
      } else {
        setSaveDialogState(false);
      }
    }
  }, [openConfirmation,openNotice,integration,newIntegration,setSaveDialogState]);

  useEffect(() => {
    if(newIntegration) {
      if(!activateAllServices&&(newIntegration.permissions === undefined||newIntegration.permissions.length===0)) {
        if(!openConfirmation&&!openNotice) {
          setSaveDialogState(true);
        } else {
          setSaveDialogState(false);
        }
      }
    }
    
  }, [activateAllServices,newIntegration,setSaveDialogState,openConfirmation,openNotice]);

  const handleSwitchAllChange = (e: ChangeEvent<HTMLInputElement>) => {
    if(writeAccess()) {
      const copy = structuredClone(newIntegration)

      if(copy!==undefined) {
        if(!activateAllServices) {
          copy.permissions = [];
        } else {
          copy.permissions = structuredClone(integration.permissions);
        }
    
        setNewIntegration(copy);
        setActivateAllServices(!activateAllServices);
      }
    } else {
      setNewIntegration(integration);
    }
    
    
  };

  const cannotSave = () => {
    
    if(newIntegration&&newIntegration.permissions&&(newIntegration?.permissions?.length>0||activateAllServices)) {
      return true;
    }
    return false;
  }
  
  const writeAccess = () => {
    
    if(integration.organization?.oid!=null&&(groups?.includes("APP_MPASSID_TALLENTAJA_"+integration.organization.oid)||groups?.includes(tallentajaOphGroup))) {
      return true;
    }
    return false;
  }

  const copyFormDataToURLSearchParams =
  (formData: FormData) => (searchParams: URLSearchParams) => {
    (formData as URLSearchParams).forEach((value, key) => {
      if (value) {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    });
    if(integration?.deploymentPhase) {
      searchParams.set("ympäristö",String(integration.deploymentPhase));
    }
    return searchParams;
  };

  function handleSearch(formData: FormData) {
    const copy = copyFormDataToURLSearchParams(formData);
    setSearchParams((searchParams) => resetPage(copy(searchParams)));
  }

  const saveIntegrations = async () => {
    if(writeAccess()) {
      if(newIntegration!==undefined) {
        if(newIntegration.permissions?.length == 0&&openConfirmation == false) {
          setOpenConfirmation(true);
        } else {
          const id = newIntegration.id!;
          newIntegration.permissions?.forEach((permission)=>{
            delete permission.lastUpdatedOn;
          })
          const updateResponse = await updateIntegration({ id },newIntegration);
          setIntegration(updateResponse);     
          setOpenNotice(true);
          setOpenConfirmation(false);
        }
      } 
    } else {
      setNewIntegration(integration)
    }
  };

  const clearIntegrations = () => {
    setNewIntegration(integration);
    setSaveDialogState(false);
    if(integration?.permissions === undefined || integration?.permissions?.length===0) {
      setActivateAllServices(true);
    } else {
      setActivateAllServices(false);
    }
    
  };

  const removeIntegrations = () => {
    if(writeAccess()) {
      const copy = structuredClone(newIntegration)
      if(copy!==undefined) {
        copy.permissions=[];
        setNewIntegration(copy);
        setSaveDialogState(true);
      }
    } else {
      setNewIntegration(integration);
    }
  };

  const handleSwitchChange = (row: Components.Schemas.Integration) => {
      
    if(writeAccess()) {
      const copy = structuredClone(newIntegration)

      if(copy.permissions === undefined) {
        copy.permissions = [];
      }
  
      const index:number|undefined = copy.permissions?.map((i:Components.Schemas.IntegrationPermission)=>i.to?.id).indexOf(row.id);
      if(index!=undefined) {
        if (index > -1) {
          copy?.permissions?.splice(index, 1);
        } else {
          const newServiceIntgeration:Components.Schemas.IntegrationPermission={};
          newServiceIntgeration.to={}; 
          newServiceIntgeration.to.id=row.id;
          newServiceIntgeration.lastUpdatedOn="edited";
          copy?.permissions?.push(newServiceIntgeration);
        }  
        setNewIntegration(copy);    
      }
    } else {
        setNewIntegration(integration);
    }
    
      
  };

    return (
      <>
            <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Palvelun tarjoajat" />
              <Secondary>
              <Suspense inline>
              &nbsp;( <SelectedElements {...newIntegration}/>/<TotalElements /> )
              </Suspense>
            </Secondary>
            </Typography>
            <FormattedMessage defaultMessage="Sivulla MPASSid-pääkäyttäjä voi hallinnoida palveluita, joissa on sallittu kirjautuminen MPASSid-tunnistuksenvälityspalveluun." />
            <Box display="flex" justifyContent="left" mt={3}> 
              <ServiceLinkButton></ServiceLinkButton>
            </Box>
            <Divider variant="middle" ></Divider>
            <Box display="flex" justifyContent="center" mt={3}> 
            
            <FormControlLabel sx={{ marginRight: "auto" }} control={<Switch checked={activateAllServices} onChange={e=>handleSwitchAllChange(e)}/>} label={<FormattedMessage defaultMessage="Salli kaikki palvelut" />} />
                  <Button aria-label="delete" 
                          sx={{ marginLeft: "auto" }}
                          variant="text"
                          startIcon={<DeleteIcon />} 
                          onClick={()=>removeIntegrations()} >
                    <FormattedMessage defaultMessage="Poista valinnat" />
                  </Button>
                  
            </Box>
            {writeAccess()&&(activateAllServices)&&<>
                                    <Alert severity="warning" sx={{ width: '60%' }}>
                                              <FormattedMessage defaultMessage="Yksittäisten palvelujen tilaa ei voi muuttaa, kun kaikki palvelut ovat sallittuja" />
                                    </Alert>
                                    <br></br>
                                    </>}
                                    {(!writeAccess())&&<>
                                    <Alert severity="warning" sx={{ width: '60%' }}>
                                              <FormattedMessage defaultMessage="Ei oikeuksia muuttaa sallittuja palveluja" />
                                    </Alert>
                                    <br></br>
                                    </>}   
                                    {!cannotSave()&&<>
                                    <Alert severity="warning" sx={{ width: '40%' }}>
                                              <FormattedMessage defaultMessage="Tallentaaksesi valinnat sinun pitää sallia vähintään yksi tai useampi palvelu" />
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
                        sort={[ "permissions"]}
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
                        <TableHeaderCell sort="lastUpdatedOn" component="div">
                            <FormattedMessage defaultMessage="Aktivoitu" />
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
                open={openConfirmation}
                onClose={()=>setOpenNotice(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <DialogTitle id="alert-dialog-title">
                    <FormattedMessage defaultMessage="Olet sallimassa kaikki palvelut" />
                </DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description">
                  <FormattedMessage defaultMessage="Haluatko varmasti tallentaa? Tieto yksittäisistä valinnoista poistuu tallennuksen yhteydessä." />
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={()=>setOpenConfirmation(false)} autoFocus>
                    PERUUTA
                  </Button>
                  <Button onClick={saveIntegrations} autoFocus>
                    OK
                  </Button>
                </DialogActions>
              </Dialog>
              <Dialog
                open={openNotice}
                onClose={()=>setOpenNotice(false)}
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
                  <Button onClick={()=>setOpenNotice(false)} autoFocus>
                    OK
                  </Button>
                </DialogActions>
              </Dialog>
              <Snackbar
                  open={saveDialogState}
                  anchorOrigin={snackbarLocation}>
                  
                    <Box boxShadow={5} sx={{ width: '100%', backgroundColor: 'white', border: '1px line grey' }} >
                    <Container maxWidth="sm">
                    
                        <Typography variant="h6" component="h2" sx={{ my: 2, marginLeft: 'auto', marginRight: 'auto', marginTop: '6%' }}>
                            <FormattedMessage defaultMessage="Tallenna muutokset" />
                        </Typography>
        
                        <Box display="flex" justifyContent="center" mt={2}> 
                            <Button onClick={clearIntegrations} sx={{ marginRight: "auto" }}><FormattedMessage defaultMessage="Peruuta" /></Button> 
                            {!cannotSave()&&<Button onClick={saveIntegrations} sx={{ marginLeft: "auto" }} disabled><FormattedMessage defaultMessage="Tallenna" /></Button>}
                            {cannotSave()&&<Button onClick={saveIntegrations} sx={{ marginLeft: "auto" }}><FormattedMessage defaultMessage="Tallenna" /></Button>}
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

interface RowListProps2 {
  row:Components.Schemas.Integration, 
  newIntegration:Components.Schemas.Integration|undefined,
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
      <TableCell align="center" component="div">
        <ViimeksiMuokattu row={props.row} newIntegration={props.newIntegration} />
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
    
  const allowed=props.newIntegration?.permissions?.find(i => i.to?.id === props.row.id );
  const userTestService:boolean=(mpassIdUserAttributeTestService===props.row.id)
  let checked=false;
  let switchOpacity=1;
  if(allowed) {
    checked=true;
  }
  if(props.activateAllServices) {
    checked=props.activateAllServices;
    switchOpacity=0.4
  }
  if(userTestService) {
    checked=true;
    switchOpacity=0.4
  }
  
  return(
      <Switch sx={{ opacity: switchOpacity}} disabled={props.activateAllServices||userTestService} checked={checked} onChange={()=>props.handleSwitch(props.row)}/>
  );
  
};

function ViimeksiMuokattu(props:RowListProps2) {
    
  const intl = useIntl();
  const item:Components.Schemas.IntegrationPermission|undefined=props.newIntegration?.permissions?.find(i => i.to?.id === props.row.id );
  let checked;

  if(item) {
    checked=item.lastUpdatedOn
  }
  
  if(checked) {
    if(checked==="edited") {
      return (<><FormattedMessage defaultMessage="Editoitu" /></>)
    } else {
      return(<>{new Intl.DateTimeFormat(intl.locale).format(new window.Date(checked))}</> );
    }
    
  } else {
    return(<>-</>)
  }
  
  
};

function TotalElements() {
  const integrations = useIntegrationsSpecSearchPageable();

  return <>{integrations.totalElements}</>;
}

function SelectedElements(integration: Components.Schemas.Integration) {
  const allIntegrations = useIntegrationsSpecSearchPageable();
  
  if(integration.permissions!=undefined&&integration.permissions?.length>0) {
    //Add mpassIdUserAttributeTestService to total length
    return <>{(integration.permissions.length+1)}</>;
  } else {
    return <>{allIntegrations.totalElements}</>;
  }
  
}