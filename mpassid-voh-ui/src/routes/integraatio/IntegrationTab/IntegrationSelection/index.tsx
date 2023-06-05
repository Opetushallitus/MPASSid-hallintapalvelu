import { useIntegrationSafe } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  getRole,
  typeAbbreviations,
  typeTooltips,
} from "@/routes/home/IntegrationsTable";
import {
  Alert,
  AlertTitle,
  Grid,
  Link as MuiLink,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import Attributes from "../IntegrationDetails/Attributes";
import type { DataRowProps } from "../IntegrationDetails/DataRow";
import { DataRow } from "../IntegrationDetails/DataRow";
import Metadata from "../IntegrationDetails/Metadata";
import Role from "../IntegrationDetails/Role"
import UniqueId from "../IntegrationDetails/UniqueId";

interface Props {
  id: number;
}


export default function IntegrationSelection({ id }: Props) {
  
  const [error, integration] = useIntegrationSafe({ id });

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
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Sallitut palvelun tarjoajat" />
          </Typography>
          <Grid container spacing={2} mb={3}>
            <DataRow
              object={integration}
              path="configurationEntity.idp.allowedServiceProviders"
            />
            
          </Grid>
    </>
  );
  
  
}
