import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { DataRow } from "../../DataRow";
import Type from "./Type";

interface Props {
  integration: Components.Schemas.Integration;
}

export default function SetProvider({ integration }: Props) {
  const setProvider = integration.configurationEntity!.set!;
    
  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Palvelun tiedot" />
      </Typography>
      
      <Grid container spacing={2} mb={2}>
        <DataRow object={integration} path="id" />
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
        <DataRow object={setProvider} path="name" />
      </Grid>
      <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Palvelun integraatiot" />
          </Typography>
          <Grid container spacing={3} mb={3}>
            <DataRow
              object={integration}
              path="integrationSets"
              type="set-list"
              
            />
          </Grid>
    </>
  );
}
