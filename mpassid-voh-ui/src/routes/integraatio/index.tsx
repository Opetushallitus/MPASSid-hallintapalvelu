import ErrorBoundary from "@/components/ErrorBoundary";
import HelpLinkButton from "@/utils/components/HelpLinkButton";
import PageHeader from "@/utils/components/PageHeader";
import Suspense from "@/utils/components/Suspense";
import { Box, Paper, TableContainer } from "@mui/material";
import { useLayoutEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useParams } from "react-router-dom";
import { useSessionStorage } from "usehooks-ts";
import IntegrationTab from "./IntegrationTab";
import MpassSymboliIcon from "@/utils/components/MpassSymboliIcon";
import { openIntegrationsSessionStorageKey } from '../../config';

export default function Integraatio() {
  const { integrationId } = useParams();

  const [tabs, setValue] = useSessionStorage<string[]>(
    openIntegrationsSessionStorageKey,
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
            icon={<MpassSymboliIcon />}
            sx={{ flexGrow: 1 }}
          >
            <FormattedMessage defaultMessage="Jäsen {id}" values={{id: integrationId}} />
          </PageHeader>
          <HelpLinkButton />
        </Box>
        
        <Suspense>
          <ErrorBoundary>
            <IntegrationTab id={Number(integrationId)} />
          </ErrorBoundary>
          
        </Suspense>
      </TableContainer>
      
    </>
  );
}