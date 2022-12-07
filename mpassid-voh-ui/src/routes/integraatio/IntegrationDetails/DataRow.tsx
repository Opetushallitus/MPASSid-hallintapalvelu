import { Box, Grid, Paper, Tooltip } from "@mui/material";
import { get, last, toPath } from "lodash";
import type { PropsWithChildren } from "react";
import { cloneElement } from "react";
import type { MessageDescriptor } from "react-intl";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

export const tooltips = defineMessages({
  customDisplayName: {
    defaultMessage:
      "OKJ:n nimi koulunvalintasivun listauksessa. Esim. ”Lahti (perusaste)”",
    description: "työkaluvihje",
  },
  showSchools: {
    defaultMessage:
      "Näytetäänkö valintalistauksessa koulujen tiedot. Jos OKJ:llä vain yksi koulu, koulujen tietoja ei yleensä näytetä.",
    description: "työkaluvihje",
  },
  schools: {
    defaultMessage: "Listaukseen tulevat koulukoodit",
    description: "työkaluvihje",
  },
  excludedSchools: {
    defaultMessage: "Mitkä koulut jätetään pois listauksesta",
    description: "työkaluvihje",
  },
  customTitle: {
    defaultMessage: "Koulun nimen yhteydessä suluissa oleva OKJ:n nimi",
    description: "työkaluvihje",
  },
});

export const labels = defineMessages({
  surname: {
    defaultMessage: "Sukunimi",
    description: "nimiö,attribuutti",
  },
  groupLevels: {
    defaultMessage: "Luokka-aste",
    description: "nimiö,attribuutti",
  },
  roles: {
    defaultMessage: "Käyttäjän rooli",
    description: "nimiö,attribuutti",
  },
  learnerId: {
    defaultMessage: "Oppijanumero",
    description: "nimiö,attribuutti",
  },
  firstName: {
    defaultMessage: "Etunimi",
    description: "nimiö,attribuutti",
  },
  groups: {
    defaultMessage: "Luokka tai ryhmä",
    description: "nimiö,attribuutti",
  },
  legacyId: {
    defaultMessage: "Salattu yksilöintitunnus",
    description: "nimiö,attribuutti",
  },
  username: {
    defaultMessage: "Yksilöintitunnus",
    description: "nimiö,attribuutti",
  },
  schoolIds: {
    defaultMessage: "Oppilaitostunnus",
    description: "nimiö,attribuutti",
  },
  learningMaterialsCharges: {
    defaultMessage: "Oppimateriaalien maksullisuuskoodi",
    description: "nimiö,attribuutti",
  },
  tenantId: {
    defaultMessage: "Tenant ID",
    description: "nimiö,attribuutti",
  },
  datasource: {
    defaultMessage: "Data source",
    description: "nimiö,attribuutti",
  },
  clientId: {
    defaultMessage: "Client ID",
    description: "nimiö,attribuutti",
  },
  class: {
    defaultMessage: "Class",
    description: "nimiö,attribuutti",
  },
  clientKey: {
    defaultMessage: "Client Key",
    description: "nimiö,attribuutti",
  },
  clientSecret: {
    defaultMessage: "Client Secret",
    description: "nimiö",
  },
  id: {
    defaultMessage: "Hallintapalvelun sisäinen tunnus",
    description: "nimiö",
  },
  name: {
    defaultMessage: "Nimi",
    description: "nimiö",
  },
  oid: {
    defaultMessage: "OID",
    description: "nimiö",
  },
  ytunnus: {
    defaultMessage: "Y-tunnus",
    description: "nimiö",
  },
  entityId: {
    defaultMessage: "Entity-ID",
    description: "nimiö",
  },
  flowName: {
    defaultMessage: "Flow-name",
    description: "nimiö",
  },
  type: {
    defaultMessage: "Tyyppi",
    description: "nimiö",
  },
  logoUrl: {
    defaultMessage: "Logo",
    description: "nimiö",
  },
  customDisplayName: {
    defaultMessage: "OKJ:n näyttönimi",
    description: "nimiö",
  },
  showSchools: {
    defaultMessage: "Näytetäänkö koulut",
    description: "nimiö",
  },
  deploymentDate: {
    defaultMessage: "Käyttöönoton päivämäärä",
    description: "nimiö",
  },
  acceptanceDate: {
    defaultMessage: "OPH:n hyväksymispäivämäärä",
    description: "nimiö",
  },
  serviceContactAddress: {
    defaultMessage: "Palveluosoite",
    description: "nimiö",
  },
});

export function DataRowContainer({
  children,
  object,
  path,
  type = "text",
}: PropsWithChildren<Props>) {
  const value = get(object, path);
  const name = last(toPath(path));
  const label = labels[name as keyof typeof labels];
  const tooltip = tooltips[name as keyof typeof tooltips];

  const TypeComponent =
    typeof type === "function" ? type : typeComponents[type];

  return cloneElement(
    children as React.ReactElement,
    {
      name,
      label,
      tooltip,
    },
    <TypeComponent value={value} />
  );
}

interface Props {
  object: Parameters<typeof get>[0];
  path: Parameters<typeof get>[1];
  type?:
    | keyof typeof typeComponents
    | (({ value }: { value: any }) => JSX.Element);
}

export function DataRow(props: Props) {
  return (
    <DataRowContainer {...props}>
      <DataRowBase />
    </DataRowContainer>
  );
}

export type DataRowProps = PropsWithChildren<{
  name?: string;
  label?: MessageDescriptor;
  tooltip?: MessageDescriptor;
}>;

export function DataRowBase({ name, label, tooltip, children }: DataRowProps) {
  return (
    <>
      <Grid item xs={4}>
        <Tooltip
          title={
            <>
              {tooltip && (
                <Box mb={1}>
                  <FormattedMessage {...tooltip} />
                </Box>
              )}
              <code>{name}</code>
            </>
          }
        >
          <span>{label ? <FormattedMessage {...label} /> : name}</span>
        </Tooltip>
      </Grid>
      <Grid item xs={8}>
        {children}
      </Grid>
    </>
  );
}

export function Boolean({ value }: { value?: boolean }) {
  return value ? (
    <FormattedMessage defaultMessage="Kyllä" />
  ) : (
    <FormattedMessage defaultMessage="Ei" />
  );
}

export function Date({ value }: { value?: string }) {
  const intl = useIntl();

  return (
    <>
      {value
        ? new Intl.DateTimeFormat(intl.locale).format(new window.Date(value))
        : "–"}
    </>
  );
}

export function Image({ value }: { value?: string }) {
  const intl = useIntl();
  return value ? (
    <Paper variant="outlined" sx={{ display: "inline-flex" }}>
      <img
        src={value}
        alt={intl.formatMessage({
          defaultMessage: "organisaation logo",
          description: "saavutettavuus",
        })}
      />
    </Paper>
  ) : null;
}

export function Text({ value }: { value?: string }) {
  return <>{value}</>;
}

export function TextList({ value = [] }: { value?: string[] }) {
  return (
    <>
      {value.length
        ? value.map((value, index) => <div key={index}>{value}</div>)
        : "–"}
    </>
  );
}

export const typeComponents = {
  boolean: Boolean,
  image: Image,
  date: Date,
  text: Text,
  "text-list": TextList,
};
