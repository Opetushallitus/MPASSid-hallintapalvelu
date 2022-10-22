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
      onClick={() =>
        setSearchParams((searchParams) => {
          searchParams.delete("sort");

          if (!Array.isArray(paths)) {
            paths = [paths];
          }

          paths.forEach((path) => {
            searchParams.append(
              "sort",
              [path, { asc: "desc", desc: "asc" }[direction || "desc"]].join(
                ","
              )
            );
          });

          return searchParams;
        })
      }
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

  if (!Array.isArray(paths)) {
    paths = [paths];
  }

  const [, direction] = sort.find(([path]) => paths.includes(path)) ?? [
    undefined,
    false,
  ];

  return direction;
}
