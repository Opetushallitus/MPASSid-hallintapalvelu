import type { ReactNode } from "react";
import { Alert, Grid } from "@mui/material";

interface Props {
  severity: "info" | "warning";
  children: ReactNode;
}

/** An Alert in the value column (empty title cell, 6/12 wide). */
export default function NoticeRow({ severity, children }: Props) {
  return (
    <>
      <Grid size={4}></Grid>
      <Grid size={6}>
        <Alert severity={severity}>{children}</Alert>
      </Grid>
    </>
  );
}
