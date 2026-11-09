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

  const [, setValue] = useSessionStorage<string[]>(
    openIntegrationsSessionStorageKey,
    []
  );

  // Opens the tab when the page shows a new integration - not on every tab
  // list change: closing this page's tab navigates away, but this page is
  // still shown when the shorter list arrives and would add the tab back.
  useLayoutEffect(() => {
    setValue((tabs) =>
      tabs.includes(integrationId!) ? tabs : [integrationId!, ...tabs]
    );
  }, [integrationId, setValue]);

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <Box sx={{ display: "flex", alignItems: "baseline" }}>
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