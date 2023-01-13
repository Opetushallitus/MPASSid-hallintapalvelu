import type { Components } from "@/api";
import type { roles } from "@/config";
import { Grid, TextField } from "@mui/material";
import { FormattedMessage } from "react-intl";
import LinkValue from "./LinkValue";

export default function Metadata({
  configurationEntity,
  role,
}: {
  configurationEntity: Components.Schemas.ConfigurationEntity;
  role: typeof roles[number];
}) {
  const providerData = configurationEntity[role]!;

  if (providerData.metadata) {
    const value = providerData.metadata.encoding
      ? atob(providerData.metadata.content as unknown as string)
      : JSON.stringify(providerData.metadata, null, 2);

    return (
      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Metatiedot" />
        </Grid>
        <Grid item xs={8}>
          <TextField multiline rows={4} disabled value={value} fullWidth />
        </Grid>
      </Grid>
    );
  }

  if (providerData.metadataUrl) {
    return (
      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Metatiedot" />
        </Grid>
        <Grid item xs={8}>
          <LinkValue href={providerData.metadataUrl} />
        </Grid>
      </Grid>
    );
  }

  return null;
}
