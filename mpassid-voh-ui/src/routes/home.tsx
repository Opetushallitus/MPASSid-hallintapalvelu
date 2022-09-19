import { useIntegrations } from "@/api";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import {
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";
import { HeaderIcon } from "../components/HeaderIcon";

export default function Home() {
  const integrations = useIntegrations() as any[];

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 3 }}>
        <Typography variant="h2" gutterBottom>
          <HeaderIcon>
            <IntegrationInstructionsIcon />
          </HeaderIcon>
          <FormattedMessage
            defaultMessage="Integraatiot <secondary>( {length} )</secondary>"
            values={{
              length: integrations.length,
              secondary: (chunks) => (
                <Typography color="text.secondary" component="span">
                  {chunks}
                </Typography>
              ),
            }}
          />
        </Typography>
        <Divider />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <FormattedMessage defaultMessage="Organisaation nimi" />
              </TableCell>
              <TableCell>
                <FormattedMessage defaultMessage="Organisaation OID" />
              </TableCell>
              <TableCell>
                <FormattedMessage defaultMessage="Organisaation Y-tunnus" />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {integrations.map((element) => (
              <TableRow key={element.id}>
                <TableCell>
                  <Link to={`/integraatio/${element.id}`}>
                    {element.organization.name}
                  </Link>
                </TableCell>
                <TableCell>{element.organization.oid}</TableCell>
                <TableCell>{element.organization.ytunnus}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
