import { useMe } from "@/api/käyttöoikeus";
import {
  katselijaOphGroup,
  openIntegrationsSessionStorageKey,
  tallentajaOphGroup,
} from "@/config";
import AppBarNavLinkTabs from "@/utils/components/AppBarNavLinkTabs";
import TabLink from "@/utils/components/TabLink";
import MuiAppBar from "@mui/material/AppBar";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import { useIntl } from "react-intl";
import { useSessionStorage } from "usehooks-ts";
import InterfaceTab from "./InterfaceTab";

// The oid of the user whose open tabs are stored (kept across page reloads).
const openIntegrationsOidSessionStorageKey = `${openIntegrationsSessionStorageKey}-oid`;

export default function AppBar() {
  const intl = useIntl();

  const me=useMe();

  const [tabs] = useSessionStorage<string[]>(
    openIntegrationsSessionStorageKey,
    []
  );

  // Clear the open tabs only when the user changes (not on every mount).
  const tabsOid = sessionStorage.getItem(openIntegrationsOidSessionStorageKey);
  if(me.oid!=undefined&&tabsOid!=me.oid) {
    if(tabsOid!=null) {
      sessionStorage.removeItem(openIntegrationsSessionStorageKey);
    }
    sessionStorage.setItem(openIntegrationsOidSessionStorageKey, me.oid);
  }
  
  const mainNavLinkTabs = [
    <TabLink
      key="home"
      label={intl.formatMessage({
        defaultMessage: "Integraatiot",
      })}
      value=""
      to=""
    />,
  ];

  if ((me.groups?.includes(tallentajaOphGroup))||(me.groups?.includes(katselijaOphGroup))) {
    mainNavLinkTabs.push(
      <TabLink
        key="localisations"
        label={intl.formatMessage({
          defaultMessage: "Lokalisointi",
        })}
        value="lokalisointi"
        to="lokalisointi"
      />
    );
  }

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
            {mainNavLinkTabs}
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
