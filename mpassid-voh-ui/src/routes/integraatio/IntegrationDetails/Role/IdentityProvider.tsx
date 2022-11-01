import type { Components } from "@/api";
import { Grid, Tooltip } from "@mui/material";
import { FormattedMessage } from "react-intl";

interface Props {
  configurationEntity: Components.Schemas.IdentityProvider;
}
export default function IdentityProvider({ configurationEntity }: Props) {
  return (
    <>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <Tooltip title="entityId">
            <span>
              <FormattedMessage defaultMessage="Entity ID" />
            </span>
          </Tooltip>
        </Grid>
        <Grid item xs={8}>
          {configurationEntity.entityId}
        </Grid>
        <Grid item xs={4}>
          <Tooltip title="flowName">
            <span>
              <FormattedMessage defaultMessage="Flow name" />
            </span>
          </Tooltip>
        </Grid>
        <Grid item xs={8}>
          {configurationEntity.flowName}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Logon URL" />
        </Grid>
        <Grid item xs={8}>
          {configurationEntity.logoUrl}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Tyyppi" />
        </Grid>
        <Grid item xs={8}>
          {configurationEntity.type}
        </Grid>
      </Grid>
    </>
  );
}
