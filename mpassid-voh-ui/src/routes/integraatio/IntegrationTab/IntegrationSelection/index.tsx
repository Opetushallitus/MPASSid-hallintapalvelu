import { useIntegrationSafe } from "@/api";
import {
  Alert,
  AlertTitle,
  Grid,
  Link as MuiLink,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { DataRow } from "../DataRow";

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
            <FormattedMessage defaultMessage="Palvelun tarjoajat" />
          </Typography>
          <Grid container spacing={3} mb={3}>
            <DataRow
              object={integration}
              path="allowedIntegrations"
              type="sp-list"
              
            />
          </Grid>
    </>
  );
  
  
}
