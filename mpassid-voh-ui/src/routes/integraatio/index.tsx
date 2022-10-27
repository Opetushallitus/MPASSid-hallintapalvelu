import PageHeader from "@/utils/components/PageHeader";
import Suspense from "@/utils/components/Suspense";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import { Divider, Paper, TableContainer } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useParams } from "react-router-dom";
import IntegrationDetails from "./IntegrationDetails";

export default function Integraatio() {
  const { integrationId } = useParams();

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <PageHeader icon={<IntegrationInstructionsIcon />}>
          <FormattedMessage defaultMessage="Integraatio" />
        </PageHeader>
        <Divider sx={{ marginBottom: 2 }} />
        <Suspense>
          <IntegrationDetails id={Number(integrationId)} />
        </Suspense>
      </TableContainer>
    </>
  );
}
