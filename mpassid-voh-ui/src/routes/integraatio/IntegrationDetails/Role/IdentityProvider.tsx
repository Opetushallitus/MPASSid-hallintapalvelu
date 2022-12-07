import type { Components } from "@/api";
import { useKoodisByKoodisto } from "@/api/koodisto";
import { testLink } from "@/config";
import getKoodistoValue from "@/utils/getKoodistoValue";
import toLanguage from "@/utils/toLanguage";
import { Grid, Link, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { Attribute } from "../Attribute";
import { DataRow, TextList } from "../DataRow";
import Type from "./Type";

interface Props {
  integration: Components.Schemas.Integration;
}

export default function IdentityProvider({ integration }: Props) {
  const institutionTypes = useKoodisByKoodisto("oppilaitostyyppi");
  const language = toLanguage(useIntl().locale).toUpperCase();

  const identityProvider = integration.configurationEntity!.idp!;

  const TypeComponent =
    typeComponents[identityProvider.type as keyof typeof typeComponents];

  const testLinkHref =
    // eslint-disable-next-line no-new-func
    new Function("flowName", `return \`${testLink}\``)(
      identityProvider.flowName
    );

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="OKJ-integraatiotyyppikohtaiset tiedot" />
      </Typography>

      <Grid container spacing={2} mb={3}>
        <DataRow object={identityProvider} path="type" type={Type} />
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Oppilaitostyypit" />
        </Grid>
        <Grid item xs={8}>
          <TextList
            value={
              identityProvider.institutionTypes?.length
                ? identityProvider.institutionTypes.map(
                    (institutionType) =>
                      `${getKoodistoValue(
                        institutionTypes,
                        String(institutionType),
                        language
                      )} (${institutionType})`
                  )
                : []
            }
          />
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Testauslinkki" />
        </Grid>
        <Grid item xs={8} zeroMinWidth>
          <Link
            href={testLinkHref}
            sx={{
              display: "inline-block",
              maxWidth: 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              verticalAlign: "top",
            }}
          >
            {testLinkHref}
          </Link>
        </Grid>
        {TypeComponent && (
          <TypeComponent {...integration.configurationEntity} />
        )}
      </Grid>
    </>
  );
}

const typeComponents = {
  azure: function Azure(props: Components.Schemas.ConfigurationEntity) {
    return (
      <>
        <Attribute configurationEntity={props} name="applicationId" />
        <Attribute configurationEntity={props} name="tenantId" />
        <DataRow object={props} path="idp.Metadatan URL" />
        <DataRow object={props} path="idp.clientSecret" />
        <DataRow object={props} path="idp.Client secret'in voimassaolo" />
        <DataRow object={props} path="idp.Application ID URI" />
        <DataRow object={props} path="idp.Metadatan voimassaolo" />
        <DataRow
          object={props}
          path="idp.SAML-allekirjoitusvarmenteen voimassaolo"
        />
        <DataRow object={props} path="idp.SAML-salausvarmenteen voimassaolo" />
        <DataRow object={props} path="idp.Redirect URI" />
      </>
    );
  },
  google: function Google(props: Components.Schemas.ConfigurationEntity) {
    return (
      <>
        <DataRow object={props} path="idp.SAML-metadata" />
        <DataRow
          object={props}
          path="idp.Metadatan voimassaolon päättymispäivämäärä"
        />
        <DataRow
          object={props}
          path="idp.SAML-allekirjoitusvarmenteen voimassaolon päättymispäivämäärä"
        />
        <DataRow
          object={props}
          path="idp.SAML-salausvarmenteen voimassaolon päättymipäivämäärä"
        />
      </>
    );
  },
  adfs: function Adfs(props: Components.Schemas.ConfigurationEntity) {
    return (
      <>
        <DataRow object={props} path="idp.ADFS-metadata URL" />
        <DataRow
          object={props}
          path="idp.Metadatan voimassaolon päättymispäivämäärä"
        />
        <DataRow
          object={props}
          path="idp.SAML-allekirjoitusvarmenteen voimassaolon päättymispäivämäärä"
        />
        <DataRow
          object={props}
          path="idp.SAML-salausvarmenteen voimassaolon päättymipäivämäärä"
        />
      </>
    );
  },
  wilma: function Wilma(props: Components.Schemas.ConfigurationEntity) {
    return (
      <>
        <DataRow object={props} path="idp.Wilma instanssi" />
      </>
    );
  },
  opinsys: function Opinsys(props: Components.Schemas.ConfigurationEntity) {
    return (
      <>
        <DataRow object={props} path="idp.Opinsys instanssin osoite" />
        <Attribute configurationEntity={props} name="clientId" />
        <Attribute configurationEntity={props} name="clientKey" />
      </>
    );
  },
};
