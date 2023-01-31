import { useIntegrationSafe } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  getRole,
  typeAbbreviations,
  typeTooltips,
} from "@/routes/home/IntegrationsTable";
import {
  Alert,
  AlertTitle,
  Grid,
  Link as MuiLink,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import Attributes from "./Attributes";
import type { DataRowProps } from "./DataRow";
import { DataRow } from "./DataRow";
import Metadata from "./Metadata";
import Role from "./Role";
import UniqueId from "./UniqueId";

interface Props {
  id: number;
}

export default function IntegrationDetails({ id }: Props) {
  const [error, integration] = useIntegrationSafe({ id });

  if (error?.response?.status === 404) {
    return (
      <Alert severity="error">
        <FormattedMessage
          defaultMessage="<title>Integraatiota {id} ei löydy</title>Siirry <link>etusivulle</link>."
          values={{
            id,
            title: (chunks) => <AlertTitle>{chunks}</AlertTitle>,
            link: (chunks) => (
              <MuiLink color="error" component={Link} to="/">
                {chunks}
              </MuiLink>
            ),
          }}
        />
      </Alert>
    );
  }

  const role = getRole(integration);

  const hasAttributes =
    role === "idp" &&
    !["opinsys", "wilma"].includes(
      integration.configurationEntity?.[role]?.type!
    );

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Organisaation tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <DataRow object={integration} path="organization.name" />
        <DataRow object={integration} path="organization.oid" />
        <DataRow object={integration} path="organization.ytunnus" />
        {role === "idp" && (
          <DataRow
            object={integration}
            path="configurationEntity.idp.logoUrl"
            type="image"
          />
        )}
      </Grid>

      {role === "idp" && (
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
          </Typography>
          <Grid container spacing={2} mb={3}>
            <DataRow
              object={integration}
              path="discoveryInformation.customDisplayName"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.showSchools"
              type="boolean"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.schools"
              type="text-list"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.excludedSchools"
              type="text-list"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.customTitle"
            />
          </Grid>
        </>
      )}

      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Integraation perustiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <DataRow object={integration} path="id" />
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Jäsentyyppi" />
        </Grid>
        <Grid item xs={8}>
          <FormattedMessage {...typeAbbreviations[role]} /> (
          <FormattedMessage {...typeTooltips[role]} />)
        </Grid>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Yksilöllinen tunniste" />
        </Grid>
        <Grid item xs={8}>
          <UniqueId
            configurationEntity={integration.configurationEntity!}
            role={role}
            ValueComponent={UniqueIdValue}
          />
        </Grid>
        <DataRow object={integration} path="deploymentDate" type="date" />
        <DataRow object={integration} path="acceptanceDate" type="date" />
        <DataRow object={integration} path="serviceContactAddress" />
      </Grid>

      <Role integration={integration} />

      <Metadata
        configurationEntity={integration.configurationEntity!}
        role={role}
      />

      <Grid mb={hasAttributes ? 3 : undefined}>
        <ErrorBoundary>
          <Attributes
            attributes={integration.configurationEntity?.attributes ?? []}
            type="data"
          />
        </ErrorBoundary>
      </Grid>

      {hasAttributes && (
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Attribuutit" />
          </Typography>
          <ErrorBoundary>
            <Attributes
              attributes={integration.configurationEntity?.attributes ?? []}
              type="user"
            />
          </ErrorBoundary>
        </>
      )}
    </>
  );
}

export function UniqueIdValue({ name, label, children }: DataRowProps) {
  return (
    <>
      {(children as JSX.Element)?.props?.value ? children : "–"} (
      <span>{label ? <FormattedMessage {...label} /> : name}</span>)
    </>
  );
}
