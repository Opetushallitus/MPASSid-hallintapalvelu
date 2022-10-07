import VirkailijaSuspense from "@/utils/components/Suspense";
import { Typography } from "@mui/material";

export const secondary = (chunks: React.ReactNode[]) => (
  <Secondary>{chunks}</Secondary>
);

export const Secondary = (props: React.ComponentProps<typeof Typography>) => (
  <Typography color="text.secondary" component="span" {...props} />
);

export const suspense = (chunks: React.ReactNode[]) => (
  <Suspense>{chunks}</Suspense>
);

export const Suspense = (
  props: React.ComponentProps<typeof VirkailijaSuspense>
) => (
  <VirkailijaSuspense
    fallback={null}
    containerComponent="span"
    wrapperComponent="span"
    {...props}
  />
);
