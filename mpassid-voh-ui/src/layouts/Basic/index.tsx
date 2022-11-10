import ErrorBoundary from "@/components/ErrorBoundary";
import useSetDocumentTitle from "@/hooks/useDocumentTitle";
import StyleIcon from "@mui/icons-material/Style";
import { Box, Container, Fab, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Link, Outlet } from "react-router-dom";
import AppBar from "./AppBar";

export default function Basic() {
  useSetDocumentTitle();

  return (
    <>
      <AppBar />
      <Container>
        <Box py={3}>
          <Typography variant="h1" gutterBottom>
            <FormattedMessage defaultMessage="MPASSid-hallinta" />
          </Typography>

          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Container>
      {!ENV.PROD && (
        <Fab
          size="small"
          component={Link}
          to="theme-showcase"
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
