import { useIntegrations } from "@/api";
import { TablePaginationWithRouterIntegration } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import type { PropsWithChildren } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { Link } from "react-router-dom";

const typeAbbreviations = defineMessages({
  IdentityProvider: {
    defaultMessage: "OKJ",
  },
  ServiceProvider: {
    defaultMessage: "PT",
  },
});

const typeTooltips = defineMessages({
  IdentityProvider: {
    defaultMessage: "Koulutuksen järjestäjä",
  },
  ServiceProvider: {
    defaultMessage: "Palveluntarjoaja",
  },
});

export default function IntagrationsTable() {
  const intl = useIntl();
  const {
    elements,
    page: { totalPages },
  } = useIntegrations();

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
            <TableCell>
              <FormattedMessage defaultMessage="Tyyppi" />
            </TableCell>
            <TableCell>
              <FormattedMessage defaultMessage="Rooli" />
            </TableCell>
            <TableCell>
              <FormattedMessage defaultMessage="Organisaatio" />
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {elements.map((element, index) => (
            <TableRow key={index}>
              <TableCell>
                <Link to={`/integraatio/${element.id}`}>{element.id}</Link>
              </TableCell>
              <TableCell>
                <Stack>
                  {element.configurationEntity.name}
                  <SecondaryCode>
                    {element.configurationEntity.idpId}
                  </SecondaryCode>
                  <SecondaryCode>
                    {element.configurationEntity.entityId}
                  </SecondaryCode>
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
                <Tooltip
                  title={intl.formatMessage(
                    typeTooltips[
                      element.configurationEntity
                        .role as keyof typeof typeTooltips
                    ]
                  )}
                >
                  <span>
                    <FormattedMessage
                      {...typeAbbreviations[
                        element.configurationEntity
                          .role as keyof typeof typeAbbreviations
                      ]}
                    />
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
          ))}
        </TableBody>
      </Table>
      {elements.length ? (
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

function SecondaryCode({ children }: PropsWithChildren) {
  return (
    <Secondary
      sx={{
        lineHeight: "initial",
        width: 250,
        textOverflow: "ellipsis",
        overflow: "hidden",
        "&:hover": {
          position: "relative",
          overflow: "visible",
        },
      }}
    >
      <Box
        component="small"
        sx={{
          backgroundColor: "var(--background-color)",
          boxShadow: "0px 0px 5px 4px var(--background-color)",
        }}
      >
        <code>{children}</code>
      </Box>
    </Secondary>
  );
}
