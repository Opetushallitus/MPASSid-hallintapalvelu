import { useEffect, useLayoutEffect, useState } from "react";
import { useMe } from "@/api/käyttöoikeus";
import {
  katselijaOphGroup,
  tallentajaOphGroup,
} from "@/config";
import { useIntegrationsSpecSearchPageable } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import HelpLinkButton from "@/utils/components/HelpLinkButton";
import PageHeader from "@/utils/components/PageHeader";
import { usePaginationPage } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import RowsPerPage from "@/utils/components/RowsPerPage";
import Suspense from "@/utils/components/Suspense";
import MpassSymboliIcon from "@/utils/components/MpassSymboliIcon";
import {
  Box,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TableContainer,
  Typography,
} from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useLocation, useSearchParams } from "react-router-dom";
import IntegrationsTable from "./IntegrationsTable";
import SearchForm from "./SearchForm";
import AddIntegrationButton from "./AddIntegrationButton"
import NewIntegrationSelection from "./NewIntegrationSelection";
import { useSessionStorage } from "usehooks-ts";
import { openIntegrationsSessionStorageKey } from "@/config";

const copyFormDataToURLSearchParams =
  (formData: FormData) => (searchParams: URLSearchParams) => {
    (formData as unknown as URLSearchParams).forEach((value, key) => {
      if (value) {
        searchParams.set(key, value); 
      } else {
        searchParams.delete(key);
      }
    });

    return searchParams;
  };

export default function Home() {
  const [, , { resetPage }] = usePaginationPage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addIntegration, setAddIntegration] = useState(false); 
  const intl = useIntl();
  const me = useMe();
  const [groups, setGroups] = useState<string[]>();
  const { state } = useLocation();

  const [tabs, setValue] = useSessionStorage<string[]>(
    openIntegrationsSessionStorageKey,
    []
  );
  
  useLayoutEffect(() => {
    if (tabs.includes(state!)) {
      setValue([ ...tabs.splice(state,1)]);
    }
  }, [state, setValue, tabs]);

  useEffect(() => {
    if(me?.groups) {
      setGroups(me.groups)
    }
  }, [me]);

  const writeAccess = () => {
    
    if((groups?.includes("APP_MPASSID_TALLENTAJA"))||groups?.includes("APP_MPASSID_PALVELU_TALLENTAJA")) {
      return true;
    } else {
      return false;
    }
    
  }

  function handleSearch(formData: FormData) {
    const copy = copyFormDataToURLSearchParams(formData);
    setSearchParams((searchParams) => resetPage(copy(searchParams)));
  }

  return (
    <>
      <Typography variant="body1" gutterBottom>
        <FormattedMessage defaultMessage="(palvelun lyhyt kuvaus)" />
      </Typography>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <Box display="flex" alignItems="baseline">
          <PageHeader
            icon={<MpassSymboliIcon />}
            sx={{ flexGrow: 1 }}
          >
            <FormattedMessage defaultMessage="Integraatiot" />{" "}
            <Secondary>
              <Suspense inline>
                ( <TotalElements /> )
              </Suspense>
            </Secondary>
          </PageHeader>
           {((groups?.includes(tallentajaOphGroup))||(groups?.includes(katselijaOphGroup)))&&
              <FormControlLabel
                key={"passiivise_integraation_switch"}
                control={
                  <Switch
                    key={"passiivise_integraation_switch"}
                    color="warning"
                    checked={JSON.parse(searchParams.get("passiiviset") ?? "false")}
                    onChange={(event) => {
                      setSearchParams((searchParams) => {
                        if (event.target.checked) {
                          searchParams.set("passiiviset", JSON.stringify(1));
                        } else {
                          searchParams.delete("passiiviset");
                        }
    
                        return resetPage(searchParams);
                      });
                    }}
                  />
                }
                label={intl.formatMessage({ defaultMessage: "Passiiviset" })}
              />
          }
          <HelpLinkButton />
        </Box>
        <Divider sx={{ marginBottom: 2 }} />
        <Stack direction="row" alignItems="center">
          <Box flex={1} sx={{ mr: 2 }}>
            <SearchForm formData={searchParams as unknown as FormData} onSearch={handleSearch} />
          </Box>
          <RowsPerPage />
        </Stack>
        <Suspense>
          <ErrorBoundary>
            <IntegrationsTable />
          </ErrorBoundary>
        </Suspense>
      </TableContainer>
      {writeAccess()&&<AddIntegrationButton setOpen={setAddIntegration}></AddIntegrationButton>}
      {writeAccess()&&<NewIntegrationSelection open={addIntegration} setOpen={setAddIntegration} />} 
    </>
  );
}

function TotalElements() {
  const integrations = useIntegrationsSpecSearchPageable();

  return <>{integrations.totalElements}</>;
}
