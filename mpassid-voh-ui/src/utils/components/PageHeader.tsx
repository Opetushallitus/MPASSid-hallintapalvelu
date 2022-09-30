import { Typography } from "@mui/material";
import { HeaderIcon } from "./HeaderIcon";

interface Props {
  children: React.ReactNode;
  icon: React.ComponentProps<typeof HeaderIcon>["children"];
}

export default function PageHeader({ children, icon }: Props) {
  return (
    <>
      <Typography variant="h2" gutterBottom>
        <HeaderIcon>{icon}</HeaderIcon>
        {children}
      </Typography>
    </>
  );
}
