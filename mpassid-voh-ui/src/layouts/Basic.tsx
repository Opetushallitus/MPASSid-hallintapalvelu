import useSetDocumentTitle from "@/hooks/useDocumentTitle";
import { Box, Container, Fab, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Link, Outlet } from "react-router-dom";
import StyleIcon from "@mui/icons-material/Style";

export default function Basic() {
  useSetDocumentTitle();

  return (
    <>
      <Container>
        <Box p={3}>
          <Typography variant="h1" gutterBottom>
            <FormattedMessage defaultMessage="MPASSid-hallinta" />
          </Typography>
          <Outlet />
        </Box>
      </Container>
      {!ENV.PROD && (
        <Fab
          size="small"
          component={Link}
          to="theme-development-helpers"
          sx={{
            position: "absolute",
            bottom: 16,
            right: 16,
          }}
        >
          <StyleIcon />
        </Fab>
      )}
    </>
  );
}
