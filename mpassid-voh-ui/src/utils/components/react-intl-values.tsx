import { Typography } from "@mui/material";

export const secondary = (chunks: React.ReactNode[]) => (
  <Secondary>{chunks}</Secondary>
);

export const Secondary = (props: React.ComponentProps<typeof Typography>) => (
  <Typography color="text.secondary" component="span" {...props} />
);
