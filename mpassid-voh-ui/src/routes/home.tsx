import { useIntegrations } from "@/api";
import { Search } from "@mui/icons-material";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import {
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useSearchParams } from "react-router-dom";
import { HeaderIcon } from "../components/HeaderIcon";

export default function Home() {
  const integrations = useIntegrations() as any[];
  const intl = useIntl();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <>
      <Typography variant="body1" gutterBottom>
        <FormattedMessage defaultMessage="(palvelun lyhyt kuvaus)" />
      </Typography>
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
        <Divider sx={{ marginBottom: 2 }} />

        <form
          onSubmit={(event) => {
            event.preventDefault();

            setSearchParams(
              new URLSearchParams(
                new FormData(event.currentTarget) as URLSearchParams
              )
            );
          }}
        >
          <TextField
            placeholder={intl.formatMessage({
              defaultMessage: "Etsi nimellä, OID:lla tai y-tunnuksella",
            })}
            name="query"
            defaultValue={searchParams.get("query")}
            fullWidth
            InputProps={{
              autoComplete: "off",
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label={intl.formatMessage({
                      defaultMessage: "etsi",
                    })}
                    type="submit"
                  >
                    <Search />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>
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
