import type { Dispatch } from "react";
import { Box, Fab } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';

interface Props {
  setOpen: Dispatch<boolean>;
}

function AddIntegrationButton({setOpen}:Props) {

  return (
    <Box display="flex" alignItems="center" justifyContent="center">
      <Fab
        color="primary"
        onClick={()=>setOpen(true)}
        aria-label="add"
        size="large"
        sx={{
          position: "fixed",
          right: 20,
          bottom: "2.2rem",
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}

export default AddIntegrationButton;