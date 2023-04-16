import { Button, Dialog, DialogActions, DialogContent } from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import ReactMarkdown from "react-markdown";

interface Props {
  changelog: string;
  version: string;
}

export default function Version({ changelog, version }: Props) {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Button
        variant="text"
        color="inherit"
        size="small"
        sx={{
          fontWeight: "initial",
          padding: "initial",
          minWidth: "initial",
        }}
        onClick={handleOpen}
      >
        {version}
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <ReactMarkdown>{changelog}</ReactMarkdown>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            <FormattedMessage defaultMessage="Sulje" />
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
