import { useIntegrationsPageable } from "@/api";
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

const typeAbbreviations = defineMessages({
  idp: {
    defaultMessage: "OKJ",
  },
  sp: {
    defaultMessage: "PT",
  },
});

const typeTooltips = defineMessages({
  idp: {
    defaultMessage: "Opetuksen ja koulutuksen järjestäjä",
  },
  sp: {
    defaultMessage: "Palveluntarjoaja",
  },
});

export default function IntagrationsTable() {
  const { content, totalPages } = useIntegrationsPageable();
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
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <FormattedMessage defaultMessage="Tunniste" />
            </TableCell>
            <TableCell>
              <FormattedMessage defaultMessage="Palvelu" />
            </TableCell>
            <TableHeaderCell
              headerName={intl.formatMessage({
                defaultMessage: "Tyyppi",
              })}
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
            />
            <TableHeaderCell
              headerName={intl.formatMessage({
                defaultMessage: "Rooli",
              })}
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
            />
            <TableCell>
              <FormattedMessage defaultMessage="Organisaatio" />
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {content.map((element, index) => (
            <Row key={index} {...element} />
          ))}
        </TableBody>
      </Table>
      {content.length ? (
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

export const getRole = (row) =>
  roles.find((role) => role in row.configurationEntity)!;

function Row(element) {
  const intl = useIntl();
  const role = getRole(element);

  return (
    <TableRow>
      <TableCell>
        <Link to={`/integraatio/${element.id}`}>{element.id}</Link>
      </TableCell>
      <TableCell>
        <Stack>
          {element.configurationEntity.name}
          <SecondaryCodeWithTooltip
            object={element}
            path={["configurationEntity", "flowName"]}
          />
          <SecondaryCodeWithTooltip
            object={element}
            path={["configurationEntity", "entityId"]}
          />
        </Stack>
      </TableCell>
      <TableCell>
        <Chip
          label={element.configurationEntity.type}
          size="small"
          color="primary"
        />
      </TableCell>
      <TableCell>
        <Tooltip title={intl.formatMessage(typeTooltips[role])}>
          <span>
            <FormattedMessage {...typeAbbreviations[role]} />
          </span>
        </Tooltip>
      </TableCell>
      <TableCell>
        <Stack>
          {element.organization.name}
          <Secondary sx={{ lineHeight: "initial" }}>
            <small>
              <FormattedMessage
                defaultMessage="OID: {value}"
                values={{ value: element.organization.oid }}
              />
            </small>
          </Secondary>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
