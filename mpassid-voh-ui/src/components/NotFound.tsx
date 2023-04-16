import useSetDocumentTitle from "@/hooks/useDocumentTitle";
import { FormattedMessage, useIntl } from "react-intl";

export default function NotFound() {
  const intl = useIntl();

  useSetDocumentTitle(intl.formatMessage({ defaultMessage: "Sivua ei löydy" }));

  return (
    <>
      <FormattedMessage defaultMessage="Sivua ei löydy" />
    </>
  );
}
