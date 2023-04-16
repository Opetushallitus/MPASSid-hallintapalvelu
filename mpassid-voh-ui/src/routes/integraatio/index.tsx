import ErrorBoundary from "@/components/ErrorBoundary";
import HelpLinkButton from "@/utils/components/HelpLinkButton";
import PageHeader from "@/utils/components/PageHeader";
import Suspense from "@/utils/components/Suspense";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import { Box, Divider, Paper, TableContainer } from "@mui/material";
import { useLayoutEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useParams } from "react-router-dom";
import { useSessionStorage } from "usehooks-ts";
import IntegrationDetails from "./IntegrationDetails";

export default function Integraatio() {
  const { integrationId } = useParams();

  const [tabs, setValue] = useSessionStorage<string[]>(
    "mpassid-open-integration-tabs",
    []
  );

  useLayoutEffect(() => {
    if (!tabs.includes(integrationId!)) {
      setValue([integrationId!, ...tabs]);
    }
  }, [integrationId, setValue, tabs]);

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <Box display="flex" alignItems="baseline">
          <PageHeader
            icon={<IntegrationInstructionsIcon />}
            sx={{ flexGrow: 1 }}
          >
            <FormattedMessage defaultMessage="Jäsenen integraatiotiedot" />
          </PageHeader>
          <HelpLinkButton />
        </Box>
        <Divider sx={{ marginBottom: 2 }} />
        <Suspense>
          <ErrorBoundary>
            <IntegrationDetails id={Number(integrationId)} />
          </ErrorBoundary>
        </Suspense>
      </TableContainer>
    </>
  );
}
