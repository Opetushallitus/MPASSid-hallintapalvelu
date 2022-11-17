import { useLocalisations } from "@/api/localisation";
import { category } from "@/config";
import toLanguage from "@/utils/toLanguage";
import type { PropsWithChildren } from "react";
import { IntlProvider as ReactIntlProvider } from "react-intl";
import defaultMessages_ from "../../lang/fi-FI.json";

interface Messages {
  [id: string]: string;
}

const defaultMessages = Object.fromEntries(
  Object.entries(defaultMessages_).map(([key, { defaultMessage }]) => [
    key,
    defaultMessage,
  ])
);

function MessagesLoader({
  children,
  language,
}: {
  children: (messages: Messages) => JSX.Element;
  language: string;
}) {
  return children(
    Object.fromEntries(
      useLocalisations({
        category,
        locale: language,
      }).map(({ key, value }) => [key, value])
    )
  );
}

export default function IntlProvider({ children }: PropsWithChildren) {
  const locale = ENV.LOCALES[0]; // TODO: hae jostain

  const defaultLanguage = toLanguage(ENV.LOCALES[0]);
  const currentLanguage = toLanguage(locale);

  const renderIntlProvider =
    // eslint-disable-next-line react/display-name
    (defaultMessages: Messages) => (messages: Messages) =>
      (
        <ReactIntlProvider
          locale={locale}
          messages={{
            ...defaultMessages,
            ...messages,
          }}
        >
          {children}
        </ReactIntlProvider>
      );

  return (
    <MessagesLoader language={defaultLanguage}>
      {defaultLanguage === currentLanguage
        ? renderIntlProvider(defaultMessages)
        : (messages) => (
            <MessagesLoader language={currentLanguage}>
              {renderIntlProvider({
                ...defaultMessages,
                ...messages,
              })}
            </MessagesLoader>
          )}
    </MessagesLoader>
  );
}
