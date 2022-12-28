import { useIntegration } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  getRole,
  typeAbbreviations,
  typeTooltips,
} from "@/routes/home/IntegrationsTable";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import Attributes from "./Attributes";
import type { DataRowProps } from "./DataRow";
import { DataRow } from "./DataRow";
import Role from "./Role";
import UniqueId from "./UniqueId";

interface Props {
  id: number;
}

export default function IntegrationDetails({ id }: Props) {
  const integration = useIntegration({ id });
  const role = getRole(integration);

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

      <Grid mb={role === "idp" ? 3 : undefined}>
        <ErrorBoundary>
          <Attributes
            attributes={integration.configurationEntity?.attributes ?? []}
            type="data"
          />
        </ErrorBoundary>
      </Grid>

      {role === "idp" && (
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
