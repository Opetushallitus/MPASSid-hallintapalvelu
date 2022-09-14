import { useIntegrations } from "@/api";
import { Table } from "@/components/Table";
import Typography from "@opetushallitus/virkailija-ui-components/Typography";
import { FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";

export default function Home() {
  const intl = useIntl();

  return (
    <>
      <Typography as="h2">
        <FormattedMessage defaultMessage="Integraatiot" />
      </Typography>
      <Table
        data={useIntegrations() as any[]}
        columns={[
          {
            header: intl.formatMessage({
              defaultMessage: "Organisaation nimi",
            }),
            id: "name",
            cell: (props) => {
              return (
                <Link
                  to={`/organisaatio/${props.row.original.organization.oid}`}
                >
                  {props.row.original.organization.name}
                </Link>
              );
            },
          },
          {
            header: intl.formatMessage({
              defaultMessage: "Organisaation OID",
            }),
            id: "oid",
            cell: (props) => {
              return props.row.original.organization.oid;
            },
          },
          {
            header: intl.formatMessage({
              defaultMessage: "Organisaation Y-tunnus",
            }),
            id: "organization",
            cell: (props) => {
              return props.row.original.organization.ytunnus;
            },
          },
        ]}
      />
    </>
  );
}
