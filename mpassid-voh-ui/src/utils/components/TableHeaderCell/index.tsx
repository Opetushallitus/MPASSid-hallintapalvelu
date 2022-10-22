import TableCellWithSortAndRouterIntegration from "./TableCellWithSortAndRouterIntegration";
import TableHeaderCellWithMenu from "./TableHeaderCellWithMenu";

interface Props extends React.ComponentProps<typeof TableHeaderCellWithMenu> {
  sort?: string | string[];
}

export default function TableHeaderCell({ sort, ...otherProps }: Props) {
  return sort ? (
    <TableCellWithSortAndRouterIntegration sort={sort} {...otherProps} />
  ) : (
    <TableHeaderCellWithMenu {...otherProps} />
  );
}
