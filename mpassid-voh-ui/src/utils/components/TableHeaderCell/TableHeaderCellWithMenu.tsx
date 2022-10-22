import { Box, TableCell } from "@mui/material";
import { isValidElement, useState } from "react";
import Menu from "./Menu";

interface Props extends React.ComponentProps<typeof TableCell> {
  menuProps?: Omit<React.ComponentProps<typeof Menu>, "headerName" | "hover">;
}

export default function TableHeaderCellWithMenu({
  children,
  menuProps,
  ...otherProps
}: Props) {
  const [hover, setHover] = useState(false);

  return menuProps ? (
    <TableCell
      {...otherProps}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Box display="flex" alignItems="center">
        <Box flexGrow={1}>{children}</Box>
        <Menu
          headerName={getStringChild(children)}
          hover={hover}
          onOpen={() => setHover(false)}
          {...menuProps}
        />
      </Box>
    </TableCell>
  ) : (
    <TableCell {...otherProps}>{children}</TableCell>
  );
}

const getStringChild = (children: React.ReactNode): string =>
  typeof children === "string"
    ? children
    : isValidElement(children)
    ? getStringChild(children.props.children)
    : "";
