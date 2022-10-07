import { HeaderIcon } from "@/utils/components/HeaderIcon";
import PageHeader from "@/utils/components/PageHeader";
import {
  TablePagination,
  TablePaginationWithRouterIntegration,
} from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import Suspense from "@/utils/components/Suspense";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";
import { Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

export default function Custom() {
  const [suspend, setSuspend] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setSuspend(true);
    }, 100);
  }, []);

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
        <Typography variant="h3" gutterBottom>
          Suspense
        </Typography>
        <Stack direction="row" spacing={2}>
          <Suspense>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa minus,
            rem temporibus eaque vel veritatis. Fuga, tempore reiciendis
            officiis incidunt commodi dignissimos, dolorum, harum eum vitae
            facere maxime perferendis quos.
          </Suspense>
          <Suspense>
            {
              // Simulate suspend
              suspend && <Suspender />
            }
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa minus,
            rem temporibus eaque vel veritatis. Fuga, tempore reiciendis
            officiis incidunt commodi dignissimos, dolorum, harum eum vitae
            facere maxime perferendis quos.
          </Suspense>
        </Stack>
      </Paper>
    </>
  );
}

function Suspender(): null {
  throw new Promise(() => {});
}
