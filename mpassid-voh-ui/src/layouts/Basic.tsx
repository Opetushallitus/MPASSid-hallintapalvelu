import useSetDocumentTitle from "@/hooks/useDocumentTitle";
import { Box, Container, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Link, Outlet } from "react-router-dom";

export default function Basic() {
  useSetDocumentTitle();

  return (
    <Container>
      <Box p={3}>
        <Typography variant="h1" gutterBottom>
          <FormattedMessage defaultMessage="MPASSid-hallinta" />
        </Typography>
        <Outlet />
        <Link to="theme-development-helpers">Theme development helpers</Link>
      </Box>
    </Container>
  );
}
