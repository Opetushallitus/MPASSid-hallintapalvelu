import { Typography } from "@mui/material";
import { HeaderIcon } from "./HeaderIcon";

interface Props extends React.ComponentProps<typeof Typography> {
  children: React.ReactNode;
  icon: React.ComponentProps<typeof HeaderIcon>["children"];
}

export default function PageHeader({ children, icon, ...otherProps }: Props) {
  return (
    <>
      <Typography variant="h2" gutterBottom {...otherProps}>
        <HeaderIcon>{icon}</HeaderIcon>
        {children}
      </Typography>
    </>
  );
}
