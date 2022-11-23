import type { Components } from "@/api";
import { attributePreferredOrder } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from "react-intl";
import { DataRow, labels } from "./DataRow";

interface Props {
  attributes: Components.Schemas.Attribute[];
}

export default function Attributes({ attributes }: Props) {
  const intl = useIntl();

  return (
    <Grid container spacing={2}>
      {attributes.length ? (
        attributes
          .map((attribute) => {
            const attributeMessageDescriptor =
              labels[attribute.name as keyof typeof labels];

            return {
              ...attribute,
              label:
                attributeMessageDescriptor &&
                intl.formatMessage(attributeMessageDescriptor),
            };
          })
          .filter(({ name }) => name)
          .sort(
            (a, b) =>
              2 *
                (attributePreferredOrder.indexOf(b.name!) -
                  attributePreferredOrder.indexOf(a.name!)) -
              (b.label ?? b.name).localeCompare(a.label ?? a.name)
          )
          .map(({ name, content }) => (
            <DataRow key={name} object={{ [name!]: content }} path={name!} />
          ))
      ) : (
        <Grid item>–</Grid>
      )}
    </Grid>
  );
}
