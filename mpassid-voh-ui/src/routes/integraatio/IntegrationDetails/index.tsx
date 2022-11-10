import { useIntegration } from "@/api";
import { useKoodisByKoodisto } from "@/api/koodisto";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import Attributes from "./Attributes";
import { DataRow } from "./DataRow";
import Role from "./Role";

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
        <DataRow object={integration} path="organization.name" />
        <DataRow object={integration} path="organization.oid" />
        <DataRow object={integration} path="organization.ytunnus" />
      </Grid>

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Integraation perustiedot" />
      </Typography>
      <Grid container spacing={2} mb={2}>
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
        <FormattedMessage defaultMessage="Attribuutit" />
      </Typography>
      <ErrorBoundary>
        <Attributes
          attributes={integration.configurationEntity.attributes ?? []}
        />
      </ErrorBoundary>
    </>
  );
}
