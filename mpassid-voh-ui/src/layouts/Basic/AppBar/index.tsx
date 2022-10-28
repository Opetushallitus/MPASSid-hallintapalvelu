import { openIntegrationsSessionStorageKey } from "@/config";
import AppBarNavLinkTabs from "@/utils/components/AppBarNavLinkTabs";
import TabLink from "@/utils/components/TabLink";
import MuiAppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import { useIntl } from "react-intl";
import { useSessionStorage } from "usehooks-ts";
import InterfaceTab from "./InterfaceTab";

export default function AppBar() {
  const intl = useIntl();

  const [tabs] = useSessionStorage<string[]>(
    openIntegrationsSessionStorageKey,
    []
  );

  return (
    <MuiAppBar>
      <Container>
        <Toolbar disableGutters>
          <AppBarNavLinkTabs
            aria-label={intl.formatMessage({
              defaultMessage: "päänavigaatio, mpassid-hallintapalvelu",
              description: "saavutettavuus",
            })}
            sx={{ flex: "none" }}
          >
            <TabLink
              label={intl.formatMessage({
                defaultMessage: "Integraatiot",
              })}
              value=""
              to=""
            />
          </AppBarNavLinkTabs>
          <AppBarNavLinkTabs
            aria-label={intl.formatMessage({
              defaultMessage:
                "avointen integraatiosivujen navigaatio, mpassid-hallintapalvelu",
              description: "saavutettavuus",
            })}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((id) => (
              <InterfaceTab key={id} id={id} value={`/integraatio/${id}`} />
            ))}
          </AppBarNavLinkTabs>
        </Toolbar>
      </Container>
    </MuiAppBar>
  );
}
