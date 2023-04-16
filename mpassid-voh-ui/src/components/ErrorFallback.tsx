import { Alert, AlertTitle, Link } from "@mui/material";
import { FormattedMessage } from "react-intl";

export default function ErrorFallback() {
  return (
    <Alert severity="error">
      <FormattedMessage
        defaultMessage="<title>Virhe</title>Ongelma näytettäessä tietoja. Ystävällisesti ole yhteydessä MPASSid-hallintapalvelun <link>ylläpitoon</link>."
        values={{
          title: (chunks) => <AlertTitle>{chunks}</AlertTitle>,
          link: ENV.SUPPORT_URI
            ? (chunks) => (
                <Link color="error" href={ENV.SUPPORT_URI}>
                  {chunks}
                </Link>
              )
            : (chunks) => chunks,
        }}
      />
    </Alert>
  );
}
