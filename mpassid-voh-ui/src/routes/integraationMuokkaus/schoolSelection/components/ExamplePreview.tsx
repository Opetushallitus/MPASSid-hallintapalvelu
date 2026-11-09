import { Grid } from "@mui/material";
import { FormattedMessage } from "react-intl";
import DataRowTitle from "./DataRowTitle";

interface Props {
  title?: string;
  exampleSchool: string;
}

/** "Esim. <koulu> (<otsikko>)": how a school is shown in the selection view. */
export default function ExamplePreview({ title, exampleSchool }: Props) {
  return (
    <>
      <DataRowTitle />
      <Grid size={8}>
        {title ? (
          <FormattedMessage
            defaultMessage="Esim. {exampleSchool} ({title})"
            values={{ exampleSchool: exampleSchool, title: title }}
          />
        ) : (
          <FormattedMessage defaultMessage="Esim. {exampleSchool}" values={{ exampleSchool: exampleSchool }} />
        )}
      </Grid>
    </>
  );
}
