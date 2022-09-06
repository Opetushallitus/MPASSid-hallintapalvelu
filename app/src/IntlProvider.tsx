import { IntlProvider as ReactIntlProvider } from "react-intl";

// TODO: käännökset ladataan verkosta ja mergetään oletusteksteihin
import messages from "../default-messages-export.json";

function useMessages() {
  return Object.fromEntries(
    Object.entries(messages).map(keyWithoutDescription)
  );
}

const keyWithoutDescription = ([key, value]: [string, string]) => {
  const [, id] = key.split(";");
  return [id, value];
};

interface Props {
  children: React.ReactNode;
}
export default function IntlProvider({ children }: Props) {
  return (
    <ReactIntlProvider locale={ENV.LOCALES[0]} messages={useMessages()}>
      {children}
    </ReactIntlProvider>
  );
}
