import { useIntegrationSafe } from "@/api";
import { mpassIdUserAttributeTestService } from "@/config";
import {
  getRole,
} from "@/routes/home/IntegrationsTable";
import {
  Alert,
  AlertTitle,
  Box,
  Link as MuiLink,
  Container,
  Tab,
  Tabs,
  CircularProgress
} from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useLocation } from "react-router-dom";
import IntegrationDetails from "./IntegrationDetails";
import IntegrationSelection from "./IntegrationSelection";
import type { Components } from "@/api";
interface Props {
  id: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  }

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Container>
          <br></br>
          <Box>
            {children}
          </Box>
        </Container>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

// No permissions, or only the test service, means all services are allowed.
const allServicesActive = (integration?: Components.Schemas.Integration) =>
  integration?.permissions === undefined || integration?.permissions?.length===0 || (integration?.permissions?.length===1&&integration.permissions.map(i=>i.to?.id).indexOf(mpassIdUserAttributeTestService)>=0 );

export default function IntegrationTab({ id }: Props) {
  const [error, origInteg] = useIntegrationSafe({ id });
  const [value, setValue] = useState(0);
  const [newIntegration, setNewIntegration] = useState<Components.Schemas.Integration | undefined>(undefined);
  const { state } = useLocation();
  // The navigation's integration (same id) wins over the loaded one, as the
  // former effects (in this order) had it.
  const pickIntegration = () => state?.id===id ? state : (origInteg!==undefined&&state?.id!==origInteg.id ? origInteg : undefined);
  const [integration, setIntegration] = useState<Components.Schemas.Integration| undefined>(pickIntegration);
  const [activateAllServices, setActivateAllServices] = useState(() => allServicesActive(integration));

  const role = origInteg ? getRole(origInteg) : undefined;

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // Adjusted while rendering instead of in effects, with the former effects'
  // triggers and order: a new navigation state or id takes the state's
  // integration, a new loaded integration (or state) the loaded one. A saved
  // integration (setIntegration from IntegrationSelection) stays until then.
  const [prevSources, setPrevSources] = useState({ state, id, origInteg });
  if(state!==prevSources.state||id!==prevSources.id||origInteg!==prevSources.origInteg) {
    setPrevSources({ state, id, origInteg });
    let picked: Components.Schemas.Integration | undefined;
    if((state!==prevSources.state||id!==prevSources.id)&&state?.id===id) {
      picked = state;
    }
    if((origInteg!==prevSources.origInteg||state!==prevSources.state)&&origInteg!==undefined&&state?.id!==origInteg.id) {
      picked = origInteg;
    }
    if(picked!==undefined) {
      setIntegration(picked);
    }
  }
  const [prevIntegration, setPrevIntegration] = useState(integration);
  if(integration!==prevIntegration) {
    setPrevIntegration(integration);
    setActivateAllServices(allServicesActive(integration));
  }

  // sp and set integrations have no second tab.
  if((role==="sp"||role==="set")&&value===1) {
    setValue(0);
  }

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

  if (integration === undefined) {
    return (<CircularProgress />)
  }
    
  return (
      <>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          {(role === "idp" || role === "sp") && (
            <Tab label={<FormattedMessage defaultMessage="Integraatiotiedot" />} {...a11yProps(0)} />
          )}
            {role === "idp" && (
            <Tab label={<FormattedMessage defaultMessage="Integraatiovalinnat" />} {...a11yProps(1)} />
            )}
            {role === "set" && (
            <Tab label={<FormattedMessage defaultMessage="Palvelutiedot" />} {...a11yProps(0)} />
            )}
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <IntegrationDetails integration={integration}  />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <IntegrationSelection 
                  integration={integration} 
                  newIntegration={newIntegration} 
                  setNewIntegration={setNewIntegration} 
                  setIntegration={setIntegration}
                  activateAllServices={activateAllServices} 
                  setActivateAllServices={setActivateAllServices}

          />
        </TabPanel>
      </Box>
      </>
    );
  
  
}
