import type { JSX } from "react";
import { Grid } from "@mui/material";
import { FormattedMessage } from "react-intl";
import type { oneEnum } from "../../Form/MultiSelectForm";
import MultiSelectForm from "../../Form/MultiSelectForm";
import { ignoreCanSave, noValidation } from "./fieldHelpers";

interface Props {
  /** Included ("schools") or excluded ("excludedSchools") schools. */
  kind: "schools" | "excludedSchools";
  values: string[];
  mandatory: boolean;
  enums: oneEnum[];
  helperText: (value: string) => JSX.Element;
  onUpdate: (values: string[]) => void;
}

/** The "schools" / "excludedSchools" select. */
export default function SchoolsField({ kind, values, mandatory, enums, helperText, onUpdate }: Props) {
  return (
    <>
      <Grid size={4}>
        {kind === "schools" ? (
          <FormattedMessage defaultMessage="schools" />
        ) : (
          <FormattedMessage defaultMessage="excludedSchools" />
        )}
      </Grid>
      <Grid size={8}>
        <MultiSelectForm
          values={values}
          label={kind === "schools" ? "schools" : "excludeSchools"}
          attributeType={"data"}
          isEditable={true}
          mandatory={mandatory}
          helperText={helperText}
          enums={enums}
          onValidate={noValidation}
          setCanSave={ignoreCanSave}
          onUpdate={onUpdate}
        />
      </Grid>
    </>
  );
}
