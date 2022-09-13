import useDocumentTitle from "@rehooks/document-title";
import { useIntl, defineMessage } from "react-intl";

const titles = [
  defineMessage({ defaultMessage: "MPASSid" }),
  defineMessage({ defaultMessage: "Opintopolku" }),
];

export default function useSetDocumentTitle(title?: string) {
  const intl = useIntl();
  useDocumentTitle(
    [title, ...titles.map((title) => intl.formatMessage(title))]
      .filter(Boolean)
      .join(" – ")
  );
}
