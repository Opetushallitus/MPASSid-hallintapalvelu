import * as localisations from "@/api/localisation";
import {
  deleteLocalisation,
  refetchLocalisations,
  useLocalisations,
} from "@/api/localisation";
import { LoadingButton } from "@mui/lab";
import type { LoadingButtonProps } from "@mui/lab/LoadingButton";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useState } from "react";
import type { MessageDescriptor } from "react-intl";
import { defineMessages, FormattedMessage } from "react-intl";
import toLanguage from "../toLanguage";
import InlineEditor from "./InlineEditor";

async function updateLocalisation(
  ...args: Parameters<typeof localisations.updateLocalisation>
) {
  const [, message] = args;
  await localisations.updateLocalisations(null, [message]);

  const { category, locale } = message;
  await refetchLocalisations({
    category,
    locale,
  });
}

const noValue = (
  <Typography variant="body2" color="text.secondary" component="em">
    –
  </Typography>
);

interface Props {
  category: string;
  defaultMessages: { [key: string]: MessageDescriptor };
}

const defaultLanguage = toLanguage(ENV.LOCALES[0]);

const languages = Object.entries(
  defineMessages({
    fi: {
      defaultMessage: "Suomi",
    },
    sv: {
      defaultMessage: "Ruotsi",
    },
    en: {
      defaultMessage: "Englanti",
    },
  })
);

export default function Localisations({ category, defaultMessages }: Props) {
  const messages = languages.map(
    ([language]) =>
      [
        language,
        // List of languages is fixed length. Here it is safe to call a hook inside a callback.
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useLocalisations({
          category,
          locale: language,
        }),
      ] as [typeof language, ReturnType<typeof useLocalisations>]
  );

  const messagesObj = Object.fromEntries(
    messages.map(([language, messages]) => [
      language,
      Object.fromEntries(messages.map((message) => [message.key, message])),
    ])
  );

  const messageList = Object.entries(defaultMessages).map(
    ([key, { defaultMessage, description }]) =>
      ({
        key,
        defaultMessage,
        description,
      } as {
        key?: string;
        defaultMessage?: string;
        description?: string;
      })
  );

  // Add any unknown messages to list
  messages.forEach(([, messages]) => {
    messages.forEach(({ key, description }) => {
      if (!messageList.some((message) => message.key === key)) {
        messageList.push({ key, description });
      }
    });
  });

  // If description is available in default language, override the original description
  messages
    .find(([language]) => language === defaultLanguage)?.[1]
    .filter(({ description }) => description)
    .forEach(({ key, description }) => {
      const message = messageList.find((message) => message.key === key);
      if (message) {
        message.description = description;
      }
    });

  messageList.sort(
    (a, b) =>
      2 * (a.description ?? "\uFFFF").localeCompare(b.description ?? "\uFFFF") +
      (a.key ?? "\uFFFF").localeCompare(b.key ?? "\uFFFF")
  );

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Käännöstekstit" />
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <FormattedMessage defaultMessage="Avain" />
              </TableCell>
              <TableCell>
                <FormattedMessage defaultMessage="Kuvaus" />
              </TableCell>
              <TableCell>
                <FormattedMessage defaultMessage="Oletusarvo" />
              </TableCell>
              {languages.map(([language, messageDescriptor]) => (
                <TableCell key={language}>
                  <FormattedMessage {...messageDescriptor} />
                </TableCell>
              ))}
              <TableCell>
                <FormattedMessage defaultMessage="Toiminnot" />
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messageList.map(({ key, defaultMessage, description }) => (
              <TableRow key={key}>
                <TableCell>{key}</TableCell>
                <InlineEditor
                  value={description}
                  onChange={async (description) => {
                    await updateLocalisation(null, {
                      category,
                      key,
                      value: key && messagesObj[defaultLanguage][key]?.value,
                      description,
                      locale: defaultLanguage,
                    });
                  }}
                >
                  <TableCell>{description ?? noValue}</TableCell>
                </InlineEditor>
                <TableCell>
                  {defaultMessage ?? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      component="em"
                    >
                      <FormattedMessage defaultMessage="Arvo puuttuu. Teksti on mahdollisesti poistunut käytöstä." />
                    </Typography>
                  )}
                </TableCell>
                {languages.map(([language]) => (
                  <InlineEditor
                    key={language}
                    value={key && messagesObj[language][key]?.value}
                    onChange={async (value) => {
                      await updateLocalisation(null, {
                        category,
                        key,
                        value,
                        description:
                          language === defaultLanguage
                            ? description
                            : undefined,
                        locale: language,
                      });
                    }}
                  >
                    <TableCell>
                      {(key && messagesObj[language][key]?.value) ?? noValue}
                    </TableCell>
                  </InlineEditor>
                ))}
                <TableCell>
                  {!defaultMessage && (
                    <LoadingStateButton
                      color="error"
                      onClick={async () => {
                        if (key) {
                          // eslint-disable-next-line no-loops/no-loops
                          for (const { language, id } of messages.map(
                            ([language, messages]) => ({
                              language,
                              id: messages.find(
                                (message) => message.key === key
                              )?.id,
                            })
                          )) {
                            if (id) {
                              await deleteLocalisation(id);
                              await refetchLocalisations({
                                category,
                                locale: language,
                              });
                            }
                          }
                        }
                      }}
                    >
                      <FormattedMessage defaultMessage="Poista" />
                    </LoadingStateButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

function LoadingStateButton(props: LoadingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoadingButton
      {...props}
      onClick={async (...args) => {
        setIsLoading(true);
        await props.onClick?.(...args);
        setIsLoading(false);
      }}
      loading={isLoading}
    />
  );
}
