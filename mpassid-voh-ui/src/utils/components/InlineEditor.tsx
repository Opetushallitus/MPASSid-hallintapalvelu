import SaveIcon from "@mui/icons-material/Save";
import { IconButton, InputAdornment, Popover, TextField } from "@mui/material";
import { cloneElement, useRef, useState } from "react";
import { useIntl } from "react-intl";

interface Props {
  children: JSX.Element;
  onChange(value: string): void;
  value?: string;
}

export default function InlineEditor({ children, onChange, value }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();
  const [isSubmtting, setIsSubmitting] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setTimeout(() => {
      inputRef.current?.select();
    });
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      {cloneElement(children, {
        onClick: handleClick,
        sx: { cursor: "pointer" },
      })}
      <Popover open={open} anchorEl={anchorEl} onClose={handleClose}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            await onChange(
              new FormData(event.currentTarget).get("value") as string
            );
            setIsSubmitting(false);
            handleClose();
          }}
        >
          <TextField
            defaultValue={value}
            inputRef={inputRef}
            name="value"
            disabled={isSubmtting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="submit"
                    color="primary"
                    aria-label={intl.formatMessage({
                      defaultMessage: "tallenna",
                    })}
                    edge="end"
                    disabled={isSubmtting}
                  >
                    <SaveIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>
      </Popover>
    </>
  );
}
