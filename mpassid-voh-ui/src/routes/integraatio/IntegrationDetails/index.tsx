import { useIntegration } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getRole } from "@/routes/home/IntegrationsTable";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import Attributes from "./Attributes";
import { DataRow } from "./DataRow";
import Role from "./Role";

interface Props {
  id: number;
}

export default function IntegrationDetails({ id }: Props) {
  const integration = useIntegration({ id });
  const role = getRole(integration);

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Organisaation tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <DataRow object={integration} path="organization.name" />
        <DataRow object={integration} path="organization.oid" />
        <DataRow object={integration} path="organization.ytunnus" />
        {role === "idp" && (
          <DataRow
            object={integration}
            path="configurationEntity.idp.logoUrl"
            type="image"
          />
        )}
      </Grid>

      {role === "idp" && (
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
          </Typography>
          <Grid container spacing={2} mb={3}>
            <DataRow
              object={integration}
              path="discoveryInformation.customDisplayName"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.showSchools"
              type="boolean"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.schools"
              type="text-list"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.excludedSchools"
              type="text-list"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.customTitle"
            />
          </Grid>
        </>
      )}

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Integraation perustiedot" />
      </Typography>
      <Grid container spacing={2} mb={2}>
        <DataRow object={integration} path="id" />
      </Grid>

      <Role integration={integration} />

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Attribuutit" />
      </Typography>
      <ErrorBoundary>
        <Attributes
          attributes={integration.configurationEntity?.attributes ?? []}
        />
      </ErrorBoundary>
    </>
  );
}
