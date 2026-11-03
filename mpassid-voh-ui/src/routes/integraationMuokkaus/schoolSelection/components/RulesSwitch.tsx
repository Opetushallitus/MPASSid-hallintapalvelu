import type { ChangeEvent } from "react";
import { Grid, Switch } from "@mui/material";
import DataRowTitle from "./DataRowTitle";

interface Props {
  checked: boolean;
  /** Locked by other production integrations' configuration (shown dimmed). */
  locked: boolean;
  /** A reload requested by the switch is still in progress. */
  awaiting: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** "Lisää kouluvalinta säännöt" (extraSchoolsConfiguration). */
export default function RulesSwitch({ checked, locked, awaiting, onChange }: Props) {
  return (
    <>
      <DataRowTitle path="extraSchoolsConfiguration" />
      <Grid size={8}>
        <Switch
          checked={checked}
          sx={{ opacity: locked ? 0.4 : 1 }}
          onChange={onChange}
          disabled={locked || awaiting}
        />
      </Grid>
    </>
  );
}
