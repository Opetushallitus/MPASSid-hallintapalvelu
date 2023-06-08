import { useIntl } from "react-intl";

export default function Type({ value }: { value: string }) {
  const intl = useIntl();

  const messageDescriptor = { id: `tyyppi.${value}` };

  return (
    <>
      {`tyyppi.${value}` in intl.messages
        ? intl.formatMessage(messageDescriptor)
        : value}
    </>
  );
}
