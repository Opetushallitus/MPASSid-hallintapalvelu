import MoreVertIcon from "@mui/icons-material/MoreVert";
import { Fade, IconButton, Menu as MuiMenu } from "@mui/material";
import { Fragment, isValidElement, useId, useState } from "react";
import { useIntl } from "react-intl";

interface Props extends Omit<React.ComponentProps<typeof MuiMenu>, "open"> {
  headerName: string;
  hover: boolean;
  active?: boolean;
  onOpen?: () => void;
}

export function Menu({
  headerName,
  children,
  hover,
  active,
  onClose,
  onOpen,
  ...otherProps
}: Props) {
  const intl = useIntl();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onOpen?.();
    setAnchorEl(event.currentTarget);
  };
  const handleClose: Props["onClose"] = (...args) => {
    onClose?.(...args);
    setAnchorEl(null);
  };
  const id = useId();
  const buttonId = useId();

  return (
    <>
      <Fade in={hover || active}>
        <IconButton
          color={active ? "primary" : "inherit"}
          id={buttonId}
          size="small"
          aria-label={intl.formatMessage(
            {
              defaultMessage: "valikko sarakkeelle: {headerName}",
            },
            {
              headerName,
            }
          )}
          sx={{
            marginTop: -10,
            marginBottom: -10,
          }}
          aria-controls={open ? id : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          onClick={handleClick}
        >
          <MoreVertIcon fontSize="inherit" />
        </IconButton>
      </Fade>
      <MuiMenu
        id={id}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          ...otherProps?.MenuListProps,
          "aria-labelledby": buttonId,
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        {...otherProps}
      >
        <OmitFragment>{children}</OmitFragment>
      </MuiMenu>
    </>
  );
}

function OmitFragment({ children }: React.PropsWithChildren) {
  return isValidElement(children) && children.type === Fragment
    ? children.props.children
    : children;
}
