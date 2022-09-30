import styleGuide from "@/utils/mui-theme/styleGuide";
import { Fab, useTheme } from "@mui/material";
import { Box } from "@mui/system";
import { cloneElement } from "react";

interface Props {
  children: React.ComponentProps<typeof Fab>["children"];
}

export function HeaderIcon({ children }: Props) {
  const theme = useTheme();

  const size = 32;

  return (
    <Box component="span" mr={1}>
      <Fab
        disabled
        size="small"
        sx={{
          borderRadius: 1,
          minHeight: size,
          height: size,
          minHWidth: size,
          width: size,
          background: `${styleGuide.colors.gray["lighten-6"]} !important`,
        }}
      >
        {cloneElement(children as React.ReactElement, {
          fontSize: "small",
          sx: { color: theme.palette.text.primary },
        })}
      </Fab>
    </Box>
  );
}
