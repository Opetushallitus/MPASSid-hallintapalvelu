import type { Components } from "@/api";
import { attributePreferredOrder } from "@/config";
import { Grid } from "@mui/material";
import { useIntl } from "react-intl";
import { DataRow } from "./DataRow";

interface Props {
  attributes: Components.Schemas.Attribute[];
  type: Components.Schemas.Attribute["type"];
}

export default function Attributes({ attributes, type }: Props) {
  const intl = useIntl();

  return (
    <Grid container spacing={2}>
      {attributes
        .filter((attribute) => attribute.type === type)
        .map((attribute) => {
          const id = `attribuutti.${attribute.name}`;
          const label = id in intl.messages ? { id } : undefined;

          return {
            ...attribute,
            label: label && intl.formatMessage(label),
          };
        })
        .filter(({ name }) => name)
        .sort(
          (a, b) =>
            2 *
              (attributePreferredOrder.indexOf(b.name!) -
                attributePreferredOrder.indexOf(a.name!)) -
            (b.label ?? b.name!).localeCompare(a.label ?? a.name!)
        )
        .map(({ name, content }) => (
          <DataRow key={name} object={{ [name!]: content }} path={name!} />
        ))}
    </Grid>
  );
}
