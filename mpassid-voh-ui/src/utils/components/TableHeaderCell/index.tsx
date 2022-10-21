import { Box, TableCell } from "@mui/material";
import { useState } from "react";
import { Menu } from "./Menu";

interface Props {
  headerName: string;
  menuProps?: Omit<React.ComponentProps<typeof Menu>, "headerName" | "hover">;
}

export default function TableHeaderCell({ headerName, menuProps }: Props) {
  return menuProps ? (
    <WithMenu headerName={headerName} menuProps={menuProps} />
  ) : (
    <TableCell>{headerName}</TableCell>
  );
}

function WithMenu({ headerName, menuProps }: Required<Props>) {
  const [hover, setHover] = useState(false);

  return (
    <TableCell
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Box display="flex" alignItems="center">
        <Box flexGrow={1}>{headerName}</Box>
        <Menu
          headerName={headerName}
          hover={hover}
          onOpen={() => setHover(false)}
          {...menuProps}
        />
      </Box>
    </TableCell>
  );
}
