import { HeaderIcon } from "@/utils/components/HeaderIcon";
import PageHeader from "@/utils/components/PageHeader";
import {
  TablePagination,
  TablePaginationWithRouterIntegration,
} from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import Suspense from "@/utils/components/Suspense";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";
import { Grid, Paper, Typography } from "@mui/material";
import { useEffect, useState } from "react";

export default function Custom() {
  const [update, setUpdate] = useState(false);

  useEffect(() => {
    setUpdate(true);
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
        <Grid container spacing={2}>
          {[
            { title: "Load", children: <Suspend /> },
            { title: "Ready" },
            { title: "Update", children: update && <Suspend /> },
          ].map(({ title, children }, index) => (
            <Grid key={index} item xs={4}>
              <Typography variant="subtitle1" gutterBottom>
                {title}
              </Typography>
              <Suspense>
                {children}
                Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa
                minus, rem temporibus eaque vel veritatis. Fuga, tempore
                reiciendis officiis incidunt commodi dignissimos, dolorum, harum
                eum vitae facere maxime perferendis quos.
              </Suspense>
            </Grid>
          ))}
        </Grid>
        <Typography variant="h3" gutterBottom>
          Suspense: <code>inline=true</code>
        </Typography>
        <Grid container spacing={2}>
          {[
            { title: "Load", children: <Suspend /> },
            { title: "Ready" },
            { title: "Update", children: update && <Suspend /> },
          ].map(({ title, children }, index) => (
            <Grid key={index} item xs={4}>
              <Typography variant="subtitle1" gutterBottom>
                {title}
              </Typography>
              Number of results:{" "}
              <Suspense inline>
                {children}
                99
              </Suspense>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </>
  );
}

// Simulate suspend
export function Suspend(): null {
  throw new Promise(() => {});
}
