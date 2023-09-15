import { useIntegrationSafe, updateIntegration } from "@/api";
import type { Components } from "@/api";
import { useIntegrationsSpecSearchPageable } from "@/api";
import { roles } from "@/config";
import { TablePaginationWithRouterIntegration } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import TableHeaderCell from "@/utils/components/TableHeaderCell";
import { FormattedMessage } from "react-intl";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Link as MuiLink,
  Typography,
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import { Link, useSearchParams } from "react-router-dom";
import type { DataRowProps } from "../DataRow";
import { ChangeEvent, useEffect, useState } from "react";
import RowsPerPage from "@/utils/components/RowsPerPage";
import SearchForm from "./../../../home/SearchForm";
import { usePaginationPage } from "@/utils/components/pagination";


interface Props {
  id: number;
}

export default function IntegrationSelection({ id }: Props) {
  
  const [error, integration] = useIntegrationSafe({ id });
  const { content, totalPages } = useIntegrationsSpecSearchPageable();
  const [, , { resetPage }] = usePaginationPage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newIntegration, setNewIntegration] = useState<Components.Schemas.Integration | undefined>(undefined);
  const [activateAllServices, setActivateAllServices] = useState(false);
  const snackbarLocation: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  } = {
    vertical: 'bottom',
    horizontal: 'center',
  }
  const [snackbarState, setSnackbarState] = useState<boolean>(false);
  
  useEffect(() => {
    setNewIntegration(integration);
    setSnackbarState(false);
    if(integration?.allowedIntegrations === undefined || integration?.allowedIntegrations?.length===0) {
      setActivateAllServices(true);
    } else {
      setActivateAllServices(false);
    }
  }, [integration]);

  

  useEffect(() => {
    if((searchParams.get("rooli") ?? "")!=="set") {
      setSearchParams("rooli=set")
    }
  }, [id,searchParams,setSearchParams]);

  const handleSwitchAllChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSnackbarState(true);
    setActivateAllServices(!activateAllServices);
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

  const saveIntegrations = () => {
    //Hae uusi integration
    //Varmista ettei ActivateAllServices=false ja allowedIntegrations length = 0, jos on niin notice ettei tuo ole mahdollista
    if(newIntegration!==undefined) {
      const updateResponse = updateIntegration({ id },newIntegration);
      setSnackbarState(false);
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
        setSnackbarState(true);
    
    }
      
  };
  
  if (error?.response?.status === 404) {
    return (
      <Alert severity="error">
        <FormattedMessage
          defaultMessage="<title>Integraatiota {id} ei löydy</title>Siirry <link>etusivulle</link>."
          values={{
            id,
            title: (chunks) => <AlertTitle>{chunks}</AlertTitle>,
            link: (chunks) => (
              <MuiLink color="error" component={Link} to="/">
                {chunks}
              </MuiLink>
            ),
          }}
        />
      </Alert>
    );
  }
  
  
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
                                               onClick={()=>removeIntegrations()} >Poista valinnat</Button>
                  
              </Box>
             <br></br>
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
                        sort={["configurationEntity.idp", "configurationEntity.sp"]}
                        component="div"
                        >
                          <FormattedMessage defaultMessage="Sallittu palvelu" />
                        </TableHeaderCell>
                        <TableHeaderCell
                        sort={[
                            "configurationEntity.idp.flowName",
                            "configurationEntity.idp.entityId",
                            "configurationEntity.sp.name",
                        ]}
                        component="div"
                        >
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
              {snackbarState&&<br></br>}
              {snackbarState&&<br></br>}
              
              <Snackbar
                  open={snackbarState}
                  anchorOrigin={snackbarLocation}>
                    <Alert severity="info" sx={{ width: '100%' }}>
                    <AlertTitle>Info</AlertTitle>
                              <FormattedMessage defaultMessage="Muutokset astuvat voimaan viimeistään 2 arkipäivän kuluessa muutoksen tallentamishetkestä." />
                              <Box display="flex" justifyContent="center" mt={2}> 
                                  <Button  variant="text" onClick={clearIntegrations} sx={{ marginRight: "auto" }}>Peruuta</Button> 
                                  <Button  variant="text" onClick={saveIntegrations} sx={{ marginLeft: "auto" }}>Tallenna muutokset</Button> 
                              </Box>
                    </Alert>
                   
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
    switchOpacity=0.2
  }
  
  return(
      <Switch sx={{ opacity: switchOpacity}} disabled={props.activateAllServices} checked={checked} onChange={()=>props.handleSwitch(props.row)}/>
  );
  
};






function UniqueIdValue({ name, label, children }: DataRowProps) {
  return (
    <>
      {(children as JSX.Element)?.props?.value ? (
        <Box
          component="div"
          sx={{
            lineHeight: "initial",
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            "&:hover": {
              position: "relative",
              overflow: "visible",
            },
          }}
        >
          <Box
            component="span"
            sx={{
              backgroundColor: "var(--background-color)",
              boxShadow: "0px 0px 5px 4px var(--background-color)",
            }}
          >
            <Tooltip title={label ? <FormattedMessage {...label} /> : name}>
              <span>{children}</span>
            </Tooltip>
          </Box>
        </Box>
      ) : null}
    </>
  );
}