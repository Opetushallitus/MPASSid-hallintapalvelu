import { Delete } from "@mui/icons-material";
import {
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Pagination,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";

export default function Misc() {
  return (
    <>
      <Typography variant="h2" gutterBottom>
        Misc
      </Typography>
      <Paper
        sx={{
          marginBottom: 3,
          padding: 3,
        }}
      >
        <Typography variant="h3" gutterBottom>
          Divider
        </Typography>
        <Divider sx={{ marginBottom: 3 }} />
        <Typography variant="h3" gutterBottom>
          Pagination
        </Typography>
        <Pagination count={5} />
        <Typography variant="h3" gutterBottom>
          CircularProgress
        </Typography>
        <CircularProgress />
        <Typography variant="h3" gutterBottom>
          Tooltip
        </Typography>
        <Tooltip title="Delete">
          <IconButton>
            <Delete />
          </IconButton>
        </Tooltip>
        <Typography variant="h3" gutterBottom>
          Switch
        </Typography>
        <Stack>
          <FormControlLabel control={<Switch />} label="Label" />
          <FormControlLabel control={<Switch defaultChecked />} label="Label" />
          <FormControlLabel control={<Switch disabled />} label="Disabled" />
        </Stack>
      </Paper>
    </>
  );
}
