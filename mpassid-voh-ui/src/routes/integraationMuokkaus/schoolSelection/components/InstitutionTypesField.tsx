import { Grid } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { helperText } from "@/utils/Validators";
import type { oneEnum } from "../../Form/MultiSelectForm";
import MultiSelectForm from "../../Form/MultiSelectForm";
import { ignoreCanSave, noValidation } from "./fieldHelpers";

interface Props {
  /** configurationEntity.idp.institutionTypes */
  selectedTypes: number[] | undefined;
  enums: oneEnum[];
  /** No school of the chosen types can be offered. */
  noSchoolsLeft: boolean;
  onUpdate: (values: string[]) => void;
}

/** "Oppilaitostyypit". */
export default function InstitutionTypesField({ selectedTypes, enums, noSchoolsLeft, onUpdate }: Props) {
  const intl = useIntl();

  const helper = (value: string) => {
    if (selectedTypes?.length === 0 && value === "") {
      return (
        <FormattedMessage
          defaultMessage="{label} on pakollinen kenttä"
          values={{
            label: intl.formatMessage({
              defaultMessage: "Oppilaitostyypit",
            }),
          }}
        />
      );
    }
    if (noSchoolsLeft) {
      return helperText(["allSchoolsUsed"], value);
    }
    return <></>;
  };

  return (
    <>
      <Grid size={4}>
        <FormattedMessage defaultMessage="Oppilaitostyypit" />
      </Grid>
      <Grid size={8}>
        <MultiSelectForm
          values={selectedTypes?.map((type) => type.toString()) || []}
          label={"Oppilaitostyypit"}
          attributeType={"data"}
          isEditable={true}
          mandatory={selectedTypes?.length === 0 || noSchoolsLeft}
          helperText={helper}
          enums={enums}
          onValidate={noValidation}
          setCanSave={ignoreCanSave}
          onUpdate={onUpdate}
        />
      </Grid>
    </>
  );
}
