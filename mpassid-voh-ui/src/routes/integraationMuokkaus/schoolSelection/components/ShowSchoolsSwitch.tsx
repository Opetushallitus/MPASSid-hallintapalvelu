import type { ChangeEvent } from "react";
import { Grid, Switch } from "@mui/material";
import DataRowTitle from "./DataRowTitle";

interface Props {
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void;
}

/** "Näytetäänkö koulut" (discoveryInformation.showSchools). */
export default function ShowSchoolsSwitch({ checked, onChange }: Props) {
  return (
    <>
      <DataRowTitle path="showSchools" />
      <Grid size={8}>
        <Switch checked={checked} onChange={onChange} />
      </Grid>
    </>
  );
}
