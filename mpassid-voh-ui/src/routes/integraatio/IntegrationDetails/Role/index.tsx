import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import {
  getRole,
  typeAbbreviations,
  typeTooltips,
} from "../../../home/IntegrationsTable";
import IdentityProvider from "./IdentityProvider";
import ServiceProvider from "./ServiceProvider";

interface Props {
  integration: Components.Schemas.Integration;
}

const roleComponents = {
  idp: IdentityProvider,
  sp: ServiceProvider,
};

export default function Role({ integration }: Props) {
  const role = getRole(integration);

  const Component = roleComponents[role];

  return (
    <>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Rooli" />
        </Grid>
        <Grid item xs={8}>
          <FormattedMessage {...typeAbbreviations[role]} /> (
          <FormattedMessage {...typeTooltips[role]} />)
        </Grid>
      </Grid>
      <Component configurationEntity={integration.configurationEntity[role]!} />
    </>
  );
}
