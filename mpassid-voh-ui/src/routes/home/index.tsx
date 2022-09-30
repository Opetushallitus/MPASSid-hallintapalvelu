import { useIntegrations } from "@/api";
import PageHeader from "@/utils/components/PageHeader";
import { usePaginationPage } from "@/utils/components/pagination";
import { secondary } from "@/utils/components/react-intl-values";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import { Divider, Paper, TableContainer, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useSearchParams } from "react-router-dom";
import IntagrationsTable, { rowsPerPage } from "./IntagrationsTable";
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
  const integrations = Array(21).fill(useIntegrations()).flat();
  const totalRows = integrations.length;
  const [page, , { resetPage }] = usePaginationPage();
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const rows = integrations.slice(start, end);
  const [searchParams, setSearchParams] = useSearchParams();

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
        <PageHeader icon={<IntegrationInstructionsIcon />}>
          <FormattedMessage
            defaultMessage="Integraatiot <secondary>( {totalRows} )</secondary>"
            values={{
              totalRows,
              secondary,
            }}
          />
        </PageHeader>
        <Divider sx={{ marginBottom: 2 }} />
        <SearchForm formData={searchParams} onSearch={handleSearch} />
        <IntagrationsTable rows={rows} totalRows={totalRows} />
      </TableContainer>
    </>
  );
}
