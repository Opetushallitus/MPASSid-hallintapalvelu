import type { Components } from "@/api";
import { useIntegrationsSearchPageable } from "@/api";
import { roles, types } from "@/config";
import { TablePaginationWithRouterIntegration } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import SecondaryCodeWithTooltip from "@/utils/components/SecondaryCodeWithTooltip";
import TableHeaderCell from "@/utils/components/TableHeaderCell";
import useFilterMenuItems from "@/utils/useFilterMenuItems";
import {
  Box,
  Chip,
  ListSubheader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";

export const typeAbbreviations = defineMessages({
  idp: {
    defaultMessage: "OKJ",
  },
  sp: {
    defaultMessage: "PT",
  },
});

export const typeTooltips = defineMessages({
  idp: {
    defaultMessage: "Opetuksen ja koulutuksen järjestäjä",
  },
  sp: {
    defaultMessage: "Palveluntarjoaja",
  },
});

const typeColors = {
  idp: "primary",
  sp: "success",
} as const;

export default function IntegrationsTable() {
  const { content, totalPages } = useIntegrationsSearchPageable();
  const intl = useIntl();

  const typeFilter = useFilterMenuItems({
    options: types,
    searchParamName: "tyyppi",
  });

  const roleFilter = useFilterMenuItems({
    options: roles,
    optionsLabels: Object.fromEntries(
      roles.map((role) => [role, intl.formatMessage(typeAbbreviations[role])])
    ),
    searchParamName: "rooli",
  });

  return (
    <>
      <Table component="div">
        <TableHead component="div">
          <TableRow component="div">
            <TableHeaderCell sort="id" component="div">
              <FormattedMessage defaultMessage="Tunniste" />
            </TableHeaderCell>
            <TableHeaderCell
              sort={[
                "configurationEntity.name",
                "configurationEntity.flowName",
                "configurationEntity.entityId",
              ]}
              component="div"
            >
              <FormattedMessage defaultMessage="Palvelu" />
            </TableHeaderCell>
            <TableHeaderCell
              sort={[
                "configurationEntity.idp.type",
                "configurationEntity.sp.type",
              ]}
              menuProps={{
                MenuListProps: {
                  subheader: (
                    <ListSubheader>
                      <FormattedMessage defaultMessage="Suodata tyypin mukaan" />
                    </ListSubheader>
                  ),
                },
                active: typeFilter.modified,
                children: typeFilter.children,
              }}
              component="div"
            >
              <FormattedMessage defaultMessage="Tyyppi" />
            </TableHeaderCell>
            <TableHeaderCell
              sort="configurationEntity.role"
              menuProps={{
                MenuListProps: {
                  subheader: (
                    <ListSubheader>
                      <FormattedMessage defaultMessage="Suodata roolin mukaan" />
                    </ListSubheader>
                  ),
                },
                active: roleFilter.modified,
                children: roleFilter.children,
              }}
              component="div"
            >
              <FormattedMessage defaultMessage="Rooli" />
            </TableHeaderCell>
            <TableHeaderCell sort="organization.name" component="div">
              <FormattedMessage defaultMessage="Organisaatio" />
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody component="div">
          {content?.map((row, index) => (
            <Row key={index} {...row} />
          ))}
        </TableBody>
      </Table>
      {content?.length ? (
        <TablePaginationWithRouterIntegration count={totalPages} />
      ) : (
        <Box display="flex" justifyContent="center" mt={3}>
          <Secondary>
            <FormattedMessage
              defaultMessage={`Valitsemillasi hakuehdoilla ei löytynyt yhtään {type, select,
                integration {integraatiota}
                other {tietoa}
              }.`}
              values={{ type: "integration" }}
            />
          </Secondary>
        </Box>
      )}
    </>
  );
}

export const getRole = (row: Components.Schemas.Integration) =>
  roles.find((role) => role in row.configurationEntity)!;

function Row(row: Components.Schemas.Integration) {
  const intl = useIntl();
  const role = getRole(row);

  return (
    <TableRow
      component={Link}
      to={`/integraatio/${row.id}`}
      hover
      sx={{ textDecorationLine: "inherit" }}
    >
      <TableCell component="div">{row.id}</TableCell>
      <TableCell component="div">
        <Stack>
          {
            //row.configurationEntity.name
          }
          <SecondaryCodeWithTooltip
            object={row}
            path={["configurationEntity", role, "flowName"]}
          />
          <SecondaryCodeWithTooltip
            object={row}
            path={["configurationEntity", role, "entityId"]}
          />
        </Stack>
      </TableCell>
      <TableCell component="div">
        <Chip
          label={row.configurationEntity[role]?.type}
          size="small"
          color={typeColors[role]}
          sx={{ cursor: "inherit" }}
        />
      </TableCell>
      <TableCell component="div">
        <Tooltip title={intl.formatMessage(typeTooltips[role])}>
          <span>
            <FormattedMessage {...typeAbbreviations[role]} />
          </span>
        </Tooltip>
      </TableCell>
      <TableCell component="div">
        <Stack>
          {row.organization.name}
          <Secondary sx={{ lineHeight: "initial" }}>
            <small>
              <FormattedMessage
                defaultMessage="OID: {value}"
                values={{ value: row.organization.oid }}
              />
            </small>
          </Secondary>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
