import AppBarNavLinkTabs from "@/utils/components/AppBarNavLinkTabs";
import { HeaderIcon } from "@/utils/components/HeaderIcon";
import PageHeader from "@/utils/components/PageHeader";
import {
  TablePagination,
  TablePaginationWithRouterIntegration,
} from "@/utils/components/pagination";
import { Secondary } from "@/utils/components/react-intl-values";
import SecondaryCodeWithTooltip from "@/utils/components/SecondaryCodeWithTooltip";
import Suspense from "@/utils/components/Suspense";
import TabLink from "@/utils/components/TabLink";
import EmojiPeopleIcon from "@mui/icons-material/EmojiPeople";
import { AppBar, Grid, Paper, Toolbar, Typography } from "@mui/material";
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

        <Typography variant="h3" gutterBottom>
          SecondaryCodeWithTooltip
        </Typography>
        <SecondaryCodeWithTooltip
          object={{
            a: {
              b: {
                c: "0123456789012345678901234567890123456789012345678901234567890123456789",
              },
            },
          }}
          path="a.b.c"
        />

        <Typography variant="h3" gutterBottom>
          AppBarNavLinkTabs
        </Typography>
        <AppBar>
          <Toolbar disableGutters>
            <AppBarNavLinkTabs>
              <TabLink
                label="Tab 1"
                value="/theme-showcase"
                to="/theme-showcase"
              />
              <TabLink
                label="Tab 2"
                value="/theme-showcase/tab-2"
                to="/theme-showcase/tab-2"
              />
              <TabLink
                label="Tab 3"
                value="/theme-showcase/tab-3"
                to="/theme-showcase/tab-3"
              />
            </AppBarNavLinkTabs>
          </Toolbar>
        </AppBar>
      </Paper>
    </>
  );
}

// Simulate suspend
export function Suspend(): null {
  throw new Promise(() => {});
}
