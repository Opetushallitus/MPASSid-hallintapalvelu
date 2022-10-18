import { alpha, Backdrop, Box, CircularProgress } from "@mui/material";
import React from "react";
import { SuspenseOverlayCore } from "suspense-overlay";

// Omit prop `open`. The prop is set by SuspenseOverlayCore.
const BackdropFallback = Backdrop as (
  props: Omit<React.ComponentProps<typeof Backdrop>, "open">
) => ReturnType<typeof Backdrop>;

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
          <BackdropFallback
            sx={{
              position: "relative",
              gridArea: "1 / 1",
              backgroundColor: (theme) =>
                alpha(theme.palette.background.paper, 0.5),
            }}
          >
            {!inline && <CircularProgress />}
          </BackdropFallback>
        }
      >
        <Box sx={{ gridArea: "1 / 1" }}>{children}</Box>
      </SuspenseOverlayCore>
    </Box>
  );
}
