import { useIntegrationSafe } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
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
  Tabs
} from "@mui/material";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import IntegrationDetails from "./IntegrationDetails";
import IntegrationSelection from "./IntegrationSelection";

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

export default function IntegrationTab({ id }: Props) {
  const [error, integration] = useIntegrationSafe({ id });
  const [value, setValue] = useState(0);

  const role = getRole(integration);
  
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    if((role==="sp"||role==="set")&&value===1) {
      setValue(0);  
    }
  }, [id, role, value]);


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
          <IntegrationDetails id={Number(integration.id)} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <IntegrationSelection id={Number(integration.id)} />
        </TabPanel>
      </Box>
      </>
    );
  
  
}
