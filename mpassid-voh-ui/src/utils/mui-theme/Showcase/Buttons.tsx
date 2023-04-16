import { Stack, Button, Paper, Typography } from "@mui/material";

export default function Buttons() {
  return (
    <>
      <Typography variant="h2" gutterBottom>
        Buttons
      </Typography>
      <Paper
        sx={{
          marginBottom: 3,
          padding: 3,
        }}
      >
        {/* <Typography variant="h3" gutterBottom>
          Virkailija
        </Typography>

        <Stack direction="row" spacing={1} marginBottom={2}>
          <Button>Primary (default)</Button>
          <Button variant="outlined">Secondary</Button>
          <Button variant="text">Tertiary</Button>
        </Stack> */}

        <Typography variant="h3" gutterBottom>
          Colors
        </Typography>

        <Stack direction="row" spacing={1} marginBottom={2}>
          <Button>Primary (default)</Button>
          <Button color="secondary">Secondary</Button>
          <Button color="error">Error</Button>
          <Button color="warning">Warning</Button>
          <Button color="success">Success</Button>
          <Button color="info">Info</Button>
          <Button color="inherit">Inherit</Button>
        </Stack>

        <Typography variant="h3" gutterBottom>
          Variants
        </Typography>

        <Stack direction="row" spacing={1} marginBottom={2}>
          <Button>Contained (default)</Button>
          <Button variant="outlined">Outlined</Button>
          <Button variant="text">Text</Button>
        </Stack>

        <Typography variant="h3" gutterBottom>
          Sizes
        </Typography>

        <Stack direction="row" spacing={1}>
          <span>
            <Button size="large">Large</Button>
          </span>
          <span>
            <Button>Medium (default)</Button>
          </span>
          <span>
            <Button size="small">Small</Button>
          </span>
        </Stack>
      </Paper>
    </>
  );
}
