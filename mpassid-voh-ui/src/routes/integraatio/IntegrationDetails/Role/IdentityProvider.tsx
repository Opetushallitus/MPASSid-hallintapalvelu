import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { DataRow } from "../DataRow";

interface Props {
  configurationEntity: Components.Schemas.IdentityProvider;
}

export default function IdentityProvider({ configurationEntity }: Props) {
  return (
    <>
      <Grid container spacing={2} mb={3}>
        <DataRow object={configurationEntity} path="entityId" />
        <DataRow object={configurationEntity} path="flowName" />
        <DataRow object={configurationEntity} path="type" />
      </Grid>

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <DataRow object={configurationEntity} path="logoUrl" />
        <DataRow object={configurationEntity} path="customDisplayName" />
        <DataRow object={configurationEntity} path="showSchools" />
        <DataRow object={configurationEntity} path="schools" />
        <DataRow object={configurationEntity} path="excludedSchools" />
        <DataRow object={configurationEntity} path="customTitle" />
      </Grid>
    </>
  );
}
