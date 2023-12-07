import HelpIcon from "@mui/icons-material/Help";
import { Button, Link } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";

export default function ServiceLinkButton() {
  const intl = useIntl();

  return (
    <Button
      component={Link}
      variant="text"
      startIcon={<HelpIcon />}
      target="_blank"
      rel="noreferrer"
      href={intl.formatMessage({
        defaultMessage: "https://www.oph.fi/fi/palvelumme/tietopalvelut/mpassid/yhteensopivat-palvelut",
        description: "palvelulinkki",
      })}
    >
      <FormattedMessage defaultMessage="Palvelu kuvaukset" />
    </Button>
  );
}
