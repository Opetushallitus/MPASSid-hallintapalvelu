import { HeaderIcon } from "@/utils/components/HeaderIcon";
import PageHeader from "@/utils/components/PageHeader";
import {
  TablePagination,
  TablePaginationWithRouterIntegration,
} from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";
import { Paper, Typography } from "@mui/material";

export default function Custom() {
  return (
    <>
      <Typography variant="h2" gutterBottom>
        Custom
      </Typography>
      <Paper
        sx={{
          marginBottom: 3,
          padding: 3,
        }}
      >
        <Typography variant="h3" gutterBottom>
          TablePaginationWithRouterIntegration
        </Typography>
        <TablePaginationWithRouterIntegration count={5} />
        <Typography variant="h3" gutterBottom>
          TablePagination
        </Typography>
        <TablePagination count={5} />
        <Typography variant="h3" gutterBottom>
          PageHeader
        </Typography>
        <PageHeader icon={<EmojiPeopleIcon />}>
          Page header with icon and secondary text{" "}
          <Secondary>( secondary text )</Secondary>
        </PageHeader>
        <Typography variant="h3" gutterBottom>
          HeaderIcon
        </Typography>
        <HeaderIcon>
          <EmojiPeopleIcon />
        </HeaderIcon>
      </Paper>
    </>
  );
}
