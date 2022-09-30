import type { Components } from "@/api";
import { TablePaginationWithRouterIntegration } from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import {
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { defineMessages, FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

export const rowsPerPage = 5;

const types = defineMessages({
  IdentityProvider: {
    defaultMessage: "Koulutuksen järjestäjä",
  },
  ServiceProvider: {
    defaultMessage: "Palveluntarjoaja",
  },
});

interface Props {
  rows: Components.Schemas.Integration[];
  totalRows: number;
}

export default function IntagrationsTable({ rows, totalRows }: Props) {
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
          {rows.map((element, index) => (
            <TableRow key={index}>
              <TableCell>
                <Link to={`/integraatio/${element.id}`}>{element.id}</Link>
              </TableCell>
              <TableCell>{element.configurationEntity.name}</TableCell>
              <TableCell>
                <Chip
                  label={element.configurationEntity.type}
                  size="small"
                  color="primary"
                />
              </TableCell>
              <TableCell>
                <FormattedMessage
                  {...types[
                    element.configurationEntity.role as keyof typeof types
                  ]}
                />
              </TableCell>
              <TableCell>
                <Stack>
                  {element.organization.name}
                  <Secondary sx={{ lineHeight: "initial" }}>
                    <small>
                      <FormattedMessage
                        defaultMessage="Y-tunnus: {value}"
                        values={{ value: element.organization.ytunnus }}
                      />
                    </small>
                  </Secondary>
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
      <TablePaginationWithRouterIntegration
        count={Math.ceil(totalRows / rowsPerPage)}
      />
    </>
  );
}
