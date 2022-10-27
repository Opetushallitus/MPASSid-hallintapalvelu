import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  getRole,
  typeAbbreviations,
  typeTooltips,
} from "../../home/IntegrationsTable";

export default function RoleInformation({ integration }) {
  const role = getRole(integration);

  const Component = { idp: Idp }[role];

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Roolin tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Rooli" />
        </Grid>
        <Grid item xs={8}>
          <FormattedMessage {...typeAbbreviations[role]} /> (
          <FormattedMessage {...typeTooltips[role]} />)
        </Grid>
      </Grid>
      <Component integration={integration.configurationEntity[role]} />
    </>
  );
}

function Idp({ integration }) {
  return (
    <>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="entityId" />
        </Grid>
        <Grid item xs={8}>
          {integration.entityId}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="flowName" />
        </Grid>
        <Grid item xs={8}>
          {integration.flowName}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="logoUrl" />
        </Grid>
        <Grid item xs={8}>
          {integration.logoUrl}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="type" />
        </Grid>
        <Grid item xs={8}>
          {integration.type}
        </Grid>
      </Grid>
    </>
  );
}
