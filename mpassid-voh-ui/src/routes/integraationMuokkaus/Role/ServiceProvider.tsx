import { Grid, Typography } from "@mui/material";
import type { Components } from "@/api";
import { FormattedMessage } from 'react-intl';
import { DataRow } from "@/routes/integraatio/IntegrationTab/DataRow";
import Type from "./Type";

interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: number;
}

export default function ServiceProvider({ integration }: Props) {
  const serviceProvider = integration.configurationEntity!.sp!;

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Palveluiden yhteiset tiedot" />
      </Typography>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Palveluympäristö" />
        </Grid>
        <Grid item xs={8}>
          <FormattedMessage
            defaultMessage={`{deploymentPhase, select,
              0 {Testi}
              1 {Tuotanto}
              2 {Tuotanto-Testi}
              other {Tuntematon}
            }`}
            values={{ deploymentPhase: integration.deploymentPhase }}
          />
        </Grid>
        <DataRow object={serviceProvider} path="name" />
        <DataRow object={serviceProvider} path="type" type={Type} />
      </Grid>
    </>
  );
}