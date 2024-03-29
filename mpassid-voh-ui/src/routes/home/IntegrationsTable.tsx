import type { Components } from "@/api";
import {
  useIntegrationsSpecSearchPageable,
  useIdentityProviderTypes,
  useServiceProviderTypes,
} from "@/api";
import { environments, roles } from "@/config";
import { TablePaginationWithRouterIntegration } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
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
import type { DataRowProps } from "../integraatio/IntegrationTab/DataRow";
import { DataRowContainer } from "../integraatio/IntegrationTab/DataRow";
import UniqueId from "../integraatio/IntegrationTab/IntegrationDetails/UniqueId";

export const typeAbbreviations = defineMessages({
  idp: {
    defaultMessage: "OKJ",
  },
  sp: {
    defaultMessage: "PI",
  },
  set: {
    defaultMessage: "PT",
  },
});

export const typeTooltips = defineMessages({
  idp: {
    defaultMessage: "Opetuksen ja koulutuksen järjestäjä",
  },
  sp: {
    defaultMessage: "Palveluintegraatio",
  },
  set: {
    defaultMessage: "Palveluntarjoaja",
  },
});
export const envAbbreviationValues = defineMessages({
  0: {
    defaultMessage: "Testi",
  },
  1: {
    defaultMessage: "Tuotanto",
  },
  2: {
    defaultMessage: "Tuotanto-Testi",
  }
});
export const envAbbreviations = (index:string) =>  {
  if("0"==index) {
    return envAbbreviationValues[index]
  }
  if("1"==index) {
    return envAbbreviationValues[index]
  }
  if("2"==index) {
    return envAbbreviationValues[index]
  }
  return {
    defaultMessage: "Ei tiedossa"
  };
}


const typeColors = {
  idp: "primary",
  sp: "success",
  set: "success"
} as const;

export default function IntegrationsTable() {
  const { content, totalPages } = useIntegrationsSpecSearchPageable();
  const intl = useIntl();
  const types = [...useIdentityProviderTypes(), ...useServiceProviderTypes()];

  const typeFilter = useFilterMenuItems({
    options: types,
    searchParamName: "tyyppi",
    optionsLabels: Object.fromEntries(
      types
        .map((type) => ({ id: `tyyppi.${type}`, type }))
        .filter(({ id }) => id in intl.messages)
        .map(({ id, type }) => {
          const messageDescriptor = { id };
          return [type, intl.formatMessage(messageDescriptor)];
        })
    ),
  });

  const roleFilter = useFilterMenuItems({
    options: roles,
    searchParamName: "rooli",
    optionsLabels: Object.fromEntries(
      roles.map((role) => [role, intl.formatMessage(typeAbbreviations[role])])
    ),
    
  });

  const envFilter = useFilterMenuItems({
    options: environments,
    searchParamName: "ympäristö",
    optionsLabels: Object.fromEntries(
      environments.map((env) => [env, intl.formatMessage(envAbbreviationValues[env])])
    ),
    
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
                  "configurationEntity.idp.flowName",
                  "configurationEntity.idp.entityId",
                  "configurationEntity.sp.name",
                ]}
                component="div">
                <FormattedMessage defaultMessage="Palvelu" />
            </TableHeaderCell>
            <TableHeaderCell
                sort={[
                  "configurationEntity.idp.type",
                  "configurationEntity.set.type",
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
                component="div">
                <FormattedMessage defaultMessage="Tyyppi" />
            </TableHeaderCell>
            <TableHeaderCell
                sort={["configurationEntity.idp", 
                       "configurationEntity.set",
                       "configurationEntity.sp"]}
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
                component="div">
                <FormattedMessage defaultMessage="Rooli" />
            </TableHeaderCell>
            <TableHeaderCell 
                sort={["deploymentPhase"]}
                menuProps={{
                  MenuListProps: {
                    subheader: (
                      <ListSubheader>
                        <FormattedMessage defaultMessage="Suodata ympäristön mukaan" />
                      </ListSubheader>
                    ),
                  },
                  active: envFilter.modified,
                  children: envFilter.children,
                }} 
                component="div">
                <FormattedMessage defaultMessage="Ympäristö" />
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
  roles.find((role) => row.configurationEntity?.[role])!;

function Row(row: Components.Schemas.Integration) {
  const intl = useIntl();
  const role = getRole(row);

  const type = row.configurationEntity?.[role]?.type;

  const messageDescriptor = { id: `tyyppi.${type}` };

  const PalveluCellContent = palveluCellContents[role];

  return (
    <TableRow
      component={Link}
      to={`/integraatio/${row.id}`}
      hover
      sx={{ textDecorationLine: "inherit" }}
    >
      <TableCell component="div">{row.id}</TableCell>
      <TableCell component="div">
        <PalveluCellContent {...row.configurationEntity!} />
      </TableCell>
      <TableCell component="div">
        <Chip
          label={
            intl.messages[`tyyppi.${type}`]
              ? intl.formatMessage(messageDescriptor)
              : type
          }
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
        <span>
        <FormattedMessage {...envAbbreviations(row?.deploymentPhase as unknown as string)} />
        </span>
      </TableCell>
      <TableCell component="div">
        <Stack>
          {row.organization?.name}
          <Secondary sx={{ lineHeight: "initial" }}>
            <small>
              <FormattedMessage
                defaultMessage="OID: {value}"
                values={{ value: row.organization?.oid }}
              />
            </small>
          </Secondary>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

const palveluCellContents = {
  idp: function Idp(props: Components.Schemas.ConfigurationEntity) {
    return (
      <Stack>
        <DataRowContainer object={props} path="idp.flowName">
          <UniqueIdValue />
        </DataRowContainer>
        <UniqueId
          configurationEntity={props}
          role="idp"
          ValueComponent={UniqueIdValue}
        />
      </Stack>
    );
  },
  sp: function Sp(props: Components.Schemas.ConfigurationEntity) {
    return (
      <Stack>
        {props.sp!.name}
        <UniqueId
          configurationEntity={props}
          role="sp"
          ValueComponent={UniqueIdValue}
        />
      </Stack>
    );
  },
  set: function Set(props: Components.Schemas.ConfigurationEntity) {
    return (
      <Stack>
        {props.set!.name}
        <UniqueId
          configurationEntity={props}
          role="set"
          ValueComponent={UniqueIdValue}
        />
      </Stack>
    );
  },
};

function UniqueIdValue({ name, label, children }: DataRowProps) {
  return (
    <>
      {(children as JSX.Element)?.props?.value ? (
        <Box
          component="div"
          sx={{
            lineHeight: "initial",
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            "&:hover": {
              position: "relative",
              overflow: "visible",
            },
          }}
        >
          <Box
            component="span"
            sx={{
              backgroundColor: "var(--background-color)",
              boxShadow: "0px 0px 5px 4px var(--background-color)",
            }}
          >
            <Tooltip title={label ? <FormattedMessage {...label} /> : name}>
              <span>{children}</span>
            </Tooltip>
          </Box>
        </Box>
      ) : null}
    </>
  );
}
