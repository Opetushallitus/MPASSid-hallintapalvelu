import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { DataRow } from "../../integraatio/IntegrationTab/DataRow";
import type { Dispatch } from "react";

interface Props {
  integration: Components.Schemas.Integration;
  name?: string;
  tenantId?: string;
  metadataUrl?: string;
  metadataFile?: File[];
  setName?: Dispatch<string>;
  setCanSave?: Dispatch<boolean>;
  setEnvironment: Dispatch<number>;
  setMetadataUrl: Dispatch<string>;
  setMetadataFile?: Dispatch<File[]>;
}

export default function SetProvider({ integration }: Props) {
  const setProvider = integration.configurationEntity!.set!;
    
  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Palvelun tiedot" />
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <DataRow object={integration} path="id" />
        <Grid size={4}>
          <FormattedMessage defaultMessage="Palveluympäristö" />
        </Grid>
        <Grid size={8}>
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
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <DataRow
              object={integration}
              path="integrationSets"
              type="set-list"
              
            />
          </Grid>
    </>
  );
}
