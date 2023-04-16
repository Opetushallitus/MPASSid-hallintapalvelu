import Tabs, { tabsClasses } from "@mui/material/Tabs";
import { merge } from "lodash";
import { Children } from "react";
import { matchPath, useLocation } from "react-router-dom";
import type TabLink from "./TabLink";

type Child = React.ReactElement<React.ComponentProps<typeof TabLink>>;

interface Props extends React.ComponentProps<typeof Tabs> {
  children: Child | Child[];
}

export default function AppBarNavLinkTabs(props: Props) {
  const routeMatch = useRouteMatch(
    Children.map(props.children, (child) => child.props.value)
  );

  return (
    <Tabs
      {...props}
      value={routeMatch ?? false}
      sx={merge(
        {
          minHeight: "inherit",
          [`.${tabsClasses.scroller}`]: { minHeight: "inherit" },
          [`.${tabsClasses.flexContainer}`]: { minHeight: "inherit" },
        },
        props.sx
      )}
    />
  );
}

function useRouteMatch(patterns: readonly string[]) {
  const { pathname } = useLocation();

  return patterns.find((pattern) => matchPath(pattern, pathname));
}
