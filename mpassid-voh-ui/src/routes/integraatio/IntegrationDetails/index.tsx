import { useIntegration } from "@/api";
import { useKoodisByKoodisto } from "@/api/koodisto";
import { attributePreferredOrder } from "@/config";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { DataRow, labels } from "./DataRow";
import Role from "./Role";

interface Props {
  id: number;
}

export default function IntegrationDetails({ id }: Props) {
  const integration = useIntegration({ id });
  const institutionTypes = useKoodisByKoodisto("oppilaitostyyppi");
  const language = useIntl().locale.split("-")[0];
  const intl = useIntl();

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Oppilaitoksen tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <DataRow object={integration} path="organization.name" />
        <DataRow object={integration} path="organization.oid" />
        <DataRow object={integration} path="organization.ytunnus" />
      </Grid>

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Integraation perustiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Oppilaitostyypit" />
        </Grid>
        <Grid item xs={8}>
          {integration.institutionTypes.length
            ? integration.institutionTypes.map((institutionType) => (
                <div key={institutionType}>
                  {
                    institutionTypes
                      .find(
                        ({ koodiArvo }) => Number(koodiArvo) === institutionType
                      )
                      ?.metadata.find(
                        (data) => data.kieli.toLowerCase() === language
                      )?.nimi
                  }{" "}
                  ({institutionType})
                </div>
              ))
            : "–"}
        </Grid>
        <DataRow object={integration} path="id" />
      </Grid>

      <Role integration={integration} />

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Konfiguraation määritteet" />
      </Typography>
      <Grid container spacing={2}>
        {(integration.configurationEntity.attributes ?? [])
          .map((attribute) => {
            const attributeMessageDescriptor =
              labels[attribute.name as keyof typeof labels];

            return {
              ...attribute,
              label:
                attributeMessageDescriptor &&
                intl.formatMessage(attributeMessageDescriptor),
            };
          })
          .sort(
            (a, b) =>
              2 *
                (attributePreferredOrder.indexOf(b.name) -
                  attributePreferredOrder.indexOf(a.name)) -
              (b.label ?? b.name).localeCompare(a.label ?? a.name)
          )
          .map(({ name, value }) => (
            <DataRow key={name} object={{ [name]: value }} path={name} />
          ))}
      </Grid>
    </>
  );
}
