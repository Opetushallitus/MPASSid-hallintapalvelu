import { useIntegration } from "@/api";
import { Grid, Typography } from "@mui/material";
import { Fragment } from "react";
import { FormattedMessage } from "react-intl";
import RoleInformation from "./RoleInformation";

interface Props {
  id: number;
}

export default function IntegrationDetails({ id }: Props) {
  const integration = useIntegration({ id });

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Organisaation tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Nimi" />
        </Grid>
        <Grid item xs={8}>
          {integration.organization.name}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="OID" />
        </Grid>
        <Grid item xs={8}>
          {integration.organization.oid}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Y-tunnus" />
        </Grid>
        <Grid item xs={8}>
          {integration.organization.ytunnus}
        </Grid>
      </Grid>

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Konfiguraation perustiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="entityId" />
        </Grid>
        <Grid item xs={8}>
          {integration.configurationEntity.entityId}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="flowName" />
        </Grid>
        <Grid item xs={8}>
          {integration.configurationEntity.flowName}
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="id" />
        </Grid>
        <Grid item xs={8}>
          {integration.id}
        </Grid>
      </Grid>

      <RoleInformation integration={integration} />

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Konfiguraation määritteet" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        {integration.configurationEntity.attributes.map((attribute) => (
          <Fragment key={attribute.name}>
            <Grid item xs={4}>
              {attribute.name}
            </Grid>
            <Grid item xs={8}>
              {attribute.value}
            </Grid>
          </Fragment>
        ))}
      </Grid>
    </>
  );
}
