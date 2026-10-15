import type { SortDirection } from "@mui/material";
import { Box, TableSortLabel } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useSearchParams } from "react-router-dom";
import TableHeaderCellWithMenu from "./TableHeaderCellWithMenu";

interface Props extends React.ComponentProps<typeof TableHeaderCellWithMenu> {
  sort: string | string[];
}

export default function TableCellWithSortAndRouterIntegration({
  children,
  sort,
  ...otherProps
}: Props) {
  const direction = useSortDirection(sort);

  return (
    <TableHeaderCellWithMenu {...otherProps} sortDirection={direction}>
      <TableSortLabelWithRouterIntegration direction={direction} paths={sort}>
        {children}
      </TableSortLabelWithRouterIntegration>
    </TableHeaderCellWithMenu>
  );
}

function TableSortLabelWithRouterIntegration({
  paths,
  direction,
  children,
}: React.PropsWithChildren<{
  direction: SortDirection;
  paths: string | string[];
}>) {
  const [, setSearchParams] = useSearchParams();

  return (
    <TableSortLabel
      active={Boolean(direction)}
      direction={direction || undefined}
      onClick={() => {
        // react-router v7 defers the committed searchParams under
        // React.startTransition, so the `direction` closure can be stale on
        // rapid clicks. The browser URL is updated synchronously by
        // history.pushState, so derive the current direction from the live
        // query string to always toggle off the latest committed state.
        const searchParams = new URLSearchParams(window.location.search);
        const pathsArray = Array.isArray(paths) ? paths : [paths];
        const liveDirection: SortDirection =
          (searchParams
            .getAll("sort")
            .map((sort) => sort.split(",") as [string, SortDirection])
            .find(([path]) => pathsArray.includes(path))?.[1] ?? false);

        searchParams.delete("sort");

        pathsArray.forEach((path) => {
          searchParams.append(
            "sort",
            [path, { asc: "desc", desc: "asc" }[liveDirection || "desc"]].join(
              ","
            )
          );
        });

        setSearchParams(searchParams);
      }}
    >
      {children}
      {direction ? (
        <Box component="span" sx={visuallyHidden}>
          <FormattedMessage
            defaultMessage={`järjestetty {direction, select,
              asc {nousevasti}
              desc {laskevasti}
              other {}
            }`}
            values={{ direction }}
          />
        </Box>
      ) : null}
    </TableSortLabel>
  );
}

function useSortDirection(paths: string | string[]) {
  const [searchParams] = useSearchParams();
  const sort = useMemo(
    () =>
      searchParams
        .getAll("sort")
        .map((sort) => sort.split(",") as [string, SortDirection]),
    [searchParams]
  );

  const pathList = Array.isArray(paths) ? paths : [paths];

  const [, direction] = sort.find(([path]) => pathList.includes(path)) ?? [
    undefined,
    false,
  ];

  return direction;
}
