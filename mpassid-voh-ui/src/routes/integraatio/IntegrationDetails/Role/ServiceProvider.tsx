import type { Components } from "@/api";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { DataRow } from "../DataRow";
import Type from "./Type";

interface Props {
  integration: Components.Schemas.Integration;
}

export default function ServiceProvider({ integration }: Props) {
  const serviceProvider = integration.configurationEntity!.sp!;

  const TypeComponent =
    typeComponents[serviceProvider.type as keyof typeof typeComponents];

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Palveluiden yhteiset tiedot" />
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Palveluympäristö" />
        </Grid>
        <Grid item xs={8}>
          <FormattedMessage
            defaultMessage={`{deploymentPhase, select,
              0 {Testiympäristö}
              1 {Tuotantoympäristö}
              other {Tuntematon}
            }`}
            values={{ deploymentPhase: integration.deploymentPhase }}
          />
        </Grid>
        <DataRow object={serviceProvider} path="name" />
        <DataRow object={serviceProvider} path="type" type={Type} />
        {TypeComponent && (
          <TypeComponent {...integration.configurationEntity} />
        )}
      </Grid>
    </>
  );
}

const typeComponents = {
  oidc: function Oidc(props: Components.Schemas.ConfigurationEntity) {
    return (
      <>
        <DataRow object={props} path="sp.clientSecret" />
        <DataRow object={props} path="idp.OIDC-json metadata" />
      </>
    );
  },
  saml2: function Saml2(props: Components.Schemas.ConfigurationEntity) {
    return (
      <>
        <DataRow object={props} path="idp.SAML-metadata" />
      </>
    );
  },
};
