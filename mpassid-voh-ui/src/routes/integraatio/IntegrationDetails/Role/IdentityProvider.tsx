import type { Components } from "@/api";
import { useKoodisByKoodisto } from "@/api/koodisto";
import getKoodistoValue from "@/utils/getKoodistoValue";
import toLanguage from "@/utils/toLanguage";
import { Grid } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { DataRow, TextList } from "../DataRow";

interface Props {
  configurationEntity: Components.Schemas.IdentityProvider;
}

export default function IdentityProvider({ configurationEntity }: Props) {
  const institutionTypes = useKoodisByKoodisto("oppilaitostyyppi");
  const language = toLanguage(useIntl().locale).toUpperCase();

  return (
    <>
      <Grid container spacing={2} mb={3}>
        <DataRow object={configurationEntity} path="entityId" />
        <DataRow object={configurationEntity} path="flowName" />
        <DataRow object={configurationEntity} path="type" />

        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Oppilaitostyypit" />
        </Grid>
        <Grid item xs={8}>
          <TextList
            value={
              configurationEntity.institutionTypes?.length
                ? configurationEntity.institutionTypes.map(
                    (institutionType) =>
                      `${getKoodistoValue(
                        institutionTypes,
                        String(institutionType),
                        language
                      )} (${institutionType})`
                  )
                : []
            }
          />
        </Grid>
      </Grid>
    </>
  );
}
