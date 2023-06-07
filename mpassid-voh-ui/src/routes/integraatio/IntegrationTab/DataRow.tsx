import { Box, Grid, Paper, Tooltip } from "@mui/material";
import { get, last, toPath } from "lodash";
import type { PropsWithChildren } from "react";
import { cloneElement } from "react";
import type { MessageDescriptor } from "react-intl";
import { FormattedMessage, useIntl } from "react-intl";

export function DataRowContainer({
  children,
  object,
  path,
  type = "text",
}: PropsWithChildren<Props>) {
  const value = get(object, path);
  const name = last(toPath(path));
  const intl = useIntl();
  const id = `attribuutti.${name}`;
  const tooltipId = `työkaluvihje.${name}`;
  const label = id in intl.messages ? { id } : undefined;
  const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;

  const TypeComponent =
    typeof type === "function" ? type : typeComponents[type];

  return cloneElement(
    children as React.ReactElement,
    {
      name,
      label,
      tooltip,
    },
    <TypeComponent value={value} />
  );
}

interface Props {
  object: Parameters<typeof get>[0];
  path: Parameters<typeof get>[1];
  type?:
    | keyof typeof typeComponents
    | (({ value }: { value: any }) => JSX.Element);
}

export function DataRow(props: Props) {
  return (
    <DataRowContainer {...props}>
      <DataRowBase />
    </DataRowContainer>
  );
}

export type DataRowProps = PropsWithChildren<{
  name?: string;
  label?: MessageDescriptor;
  tooltip?: MessageDescriptor;
}>;

export function DataRowBase({ name, label, tooltip, children }: DataRowProps) {
  return (
    <>
      <Grid item xs={4}>
        <Tooltip
          title={
            <>
              {tooltip && (
                <Box mb={1}>
                  <FormattedMessage {...tooltip} />
                </Box>
              )}
              <code>{name}</code>
            </>
          }
        >
          <span>{label ? <FormattedMessage {...label} /> : name}</span>
        </Tooltip>
      </Grid>
      <Grid item xs={8}>
        {children}
      </Grid>
    </>
  );
}

export function Boolean({ value }: { value?: boolean }) {
  return value ? (
    <FormattedMessage defaultMessage="Kyllä" />
  ) : (
    <FormattedMessage defaultMessage="Ei" />
  );
}

export function Date({ value }: { value?: string }) {
  const intl = useIntl();

  return (
    <>
      {value
        ? new Intl.DateTimeFormat(intl.locale).format(new window.Date(value))
        : "–"}
    </>
  );
}

export function Image({ value }: { value?: string }) {
  const intl = useIntl();
  return value ? (
    <Paper variant="outlined" sx={{ display: "inline-flex" }}>
      <img
        src={value}
        alt={intl.formatMessage({
          defaultMessage: "organisaation logo",
          description: "saavutettavuus",
        })}
      />
    </Paper>
  ) : null;
}

export function Text({ value }: { value?: string }) {
  return <>{value}</>;
}

export function TextList({ value = [] }: { value?: string[] }) {
  return (
    <>
      {value.length
        ? value.map((value, index) => <div key={index}>{value}</div>)
        : "–"}
    </>
  );
}

export function SPList({ value = [] }: { value?: { configurationEntity?: { sp?: { name?: String } }; organization?: { name?: String };  }[] } ) {
  return (
    <>
      {value.length
        ? value.map((value, index) => <div>{value?.configurationEntity?.sp?.name||"-"} ({value?.organization?.name||"-"})</div>)
        : "–"}
    </>
  );
}

export const typeComponents = {
  boolean: Boolean,
  image: Image,
  date: Date,
  text: Text,
  "text-list": TextList,
  "sp-list": SPList,
};
