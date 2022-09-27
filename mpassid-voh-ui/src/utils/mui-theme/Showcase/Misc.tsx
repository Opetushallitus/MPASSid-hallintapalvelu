import { Divider, Pagination, Paper, Typography } from "@mui/material";

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
      </Paper>
    </>
  );
}
