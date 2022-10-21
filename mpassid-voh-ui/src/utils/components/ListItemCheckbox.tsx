import {
  Checkbox,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useId } from "react";

export function ListItemCheckbox({
  buttonProps,
  checkboxProps,
  textProps,
}: {
  buttonProps: React.ComponentProps<typeof ListItemButton>;
  checkboxProps: React.ComponentProps<typeof Checkbox>;
  textProps: React.ComponentProps<typeof ListItemText>;
}) {
  const id = useId();

  return (
    <ListItem disablePadding>
      <ListItemButton role={undefined} dense {...buttonProps}>
        <ListItemIcon>
          <Checkbox
            edge="start"
            tabIndex={-1}
            disableRipple
            inputProps={{ "aria-labelledby": id }}
            {...checkboxProps}
          />
        </ListItemIcon>
        <ListItemText id={id} {...textProps} />
      </ListItemButton>
    </ListItem>
  );
}
