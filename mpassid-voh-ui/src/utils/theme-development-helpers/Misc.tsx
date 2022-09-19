import { Divider, Paper, Typography } from "@mui/material";

export default function Misc() {
  return (
    <>
      <Typography variant="h2" gutterBottom>
        Misc
      </Typography>
      <Paper sx={{ marginBottom: 3, padding: 3 }}>
        Divider
        <Divider />
      </Paper>
    </>
  );
}
