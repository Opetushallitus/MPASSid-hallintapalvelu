import { alpha, Backdrop, Box, CircularProgress } from "@mui/material";
import React from "react";
import { SuspenseOverlayCore } from "suspense-overlay";

export default function Suspense({
  children,
  inline,
}: React.PropsWithChildren<{ inline?: boolean }>) {
  return (
    <Box
      sx={{ position: "relative", display: inline ? "inline-grid" : "grid" }}
    >
      <SuspenseOverlayCore
        fallback={
          <Backdrop
            open={false} // Just to remove the error from the console. SuspenseOverlayCore sets the prop.
            sx={{
              position: "relative",
              gridArea: "1 / 1",
              backgroundColor: (theme) =>
                alpha(theme.palette.background.paper, 0.5),
            }}
          >
            {!inline && <CircularProgress />}
          </Backdrop>
        }
      >
        <Box sx={{ gridArea: "1 / 1" }}>{children}</Box>
      </SuspenseOverlayCore>
    </Box>
  );
}
