import { useIntegrationsSearchPageable } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageHeader from "@/utils/components/PageHeader";
import { usePaginationPage } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import RowsPerPage from "@/utils/components/RowsPerPage";
import Suspense from "@/utils/components/Suspense";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
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
import { useSearchParams } from "react-router-dom";
import IntegrationsTable from "./IntegrationsTable";
import SearchForm from "./SearchForm";

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

export default function Home() {
  const [, , { resetPage }] = usePaginationPage();
  const [searchParams, setSearchParams] = useSearchParams();
  const intl = useIntl();

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
            icon={<IntegrationInstructionsIcon />}
            sx={{ flexGrow: 1 }}
          >
            <FormattedMessage defaultMessage="Integraatiot" />{" "}
            <Secondary>
              <Suspense inline>
                ( <TotalElements /> )
              </Suspense>
            </Secondary>
          </PageHeader>
          <FormControlLabel
            control={
              <Switch
                color="warning"
                checked={JSON.parse(searchParams.get("testi") ?? "false")}
                onChange={(event) => {
                  setSearchParams((searchParams) => {
                    if (event.target.checked) {
                      searchParams.set("testi", JSON.stringify(true));
                    } else {
                      searchParams.delete("testi");
                    }

                    return resetPage(searchParams);
                  });
                }}
              />
            }
            label={intl.formatMessage({ defaultMessage: "Testi-integraatiot" })}
          />
        </Box>
        <Divider sx={{ marginBottom: 2 }} />
        <Stack direction="row" alignItems="center">
          <Box flex={1} sx={{ mr: { md: 10 } }}>
            <SearchForm formData={searchParams} onSearch={handleSearch} />
          </Box>
          <RowsPerPage />
        </Stack>
        <Suspense>
          <ErrorBoundary>
            <IntegrationsTable />
          </ErrorBoundary>
        </Suspense>
      </TableContainer>
    </>
  );
}

function TotalElements() {
  const integrations = useIntegrationsSearchPageable();

  return <>{integrations.totalElements}</>;
}