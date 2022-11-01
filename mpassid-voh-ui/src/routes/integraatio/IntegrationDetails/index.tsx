import { useIntegration } from "@/api";
import { useKoodisByKoodisto } from "@/api/koodisto";
import { Grid, Tooltip, Typography } from "@mui/material";
import { Fragment } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import Role from "./Role";

const attributes = defineMessages({
  surname: {
    defaultMessage: "Sukunimi",
  },
  groupLevels: {
    defaultMessage: "Luokka-aste",
  },
  roles: {
    defaultMessage: "Käyttäjän rooli",
  },
  learnerId: {
    defaultMessage: "Oppijanumero",
  },
  firstName: {
    defaultMessage: "Etunimi",
  },
  groups: {
    defaultMessage: "Luokka tai ryhmä",
  },
  legacyId: {
    defaultMessage: "Salattu yksilöintitunnus",
  },
  username: {
    defaultMessage: "Yksilöintitunnus",
  },
  schoolIds: {
    defaultMessage: "Oppilaitostunnus",
  },
  learningMaterialsCharges: {
    defaultMessage: "Oppimateriaalien maksullisuuskoodi",
  },
  tenantId: {
    defaultMessage: "Tenant ID",
  },
  datasource: {
    defaultMessage: "Data source",
  },
  clientId: {
    defaultMessage: "Client ID",
  },
  class: {
    defaultMessage: "Class",
  },
  clientKey: {
    defaultMessage: "Client Key",
  },
});

interface Props {
  id: number;
}

export default function IntegrationDetails({ id }: Props) {
  const integration = useIntegration({ id });
  const institutionTypes = useKoodisByKoodisto("oppilaitostyyppi");
  const language = useIntl().locale.split("-")[0];

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
          <FormattedMessage defaultMessage="Oppilaitostyypit" />
        </Grid>
        <Grid item xs={8}>
          {integration.institutionTypes
            .map(
              (institutionType) =>
                institutionTypes
                  .find(
                    ({ koodiArvo }) => Number(koodiArvo) === institutionType
                  )
                  ?.metadata.find(
                    (data) => data.kieli.toLowerCase() === language
                  )?.nimi
            )
            .join(", ") || "–"}
        </Grid>
        <Grid item xs={4}>
          <Tooltip title="id">
            <span>
              <FormattedMessage defaultMessage="Hallintapalvelun sisäinen tunnus" />
            </span>
          </Tooltip>
        </Grid>
        <Grid item xs={8}>
          {integration.id}
        </Grid>
      </Grid>

      <Role integration={integration} />

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Konfiguraation määritteet" />
      </Typography>
      <Grid container spacing={2}>
        {integration.configurationEntity.attributes?.map((attribute) => {
          const name = attribute.name as keyof typeof attributes;

          return (
            <Fragment key={name}>
              <Grid item xs={4}>
                {attributes[name] ? (
                  <Tooltip title={name}>
                    <span>{<FormattedMessage {...attributes[name]} />}</span>
                  </Tooltip>
                ) : (
                  name
                )}
              </Grid>
              <Grid item xs={8}>
                {attribute.value}
              </Grid>
            </Fragment>
          );
        })}
      </Grid>
    </>
  );
}
