import HelpIcon from "@mui/icons-material/Help";
import { Button, Link } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";

export default function HelpLinkButton() {
  const intl = useIntl();

  return (
    <Button
      component={Link}
      variant="text"
      startIcon={<HelpIcon />}
      target="_blank"
      rel="noreferrer"
      href={intl.formatMessage({
        defaultMessage: "https://example.com",
        description: "ohjelinkki",
      })}
    >
      <FormattedMessage defaultMessage="Ohjeet" />
    </Button>
  );
}
