import { Pagination } from "@mui/material";
import { Box } from "@mui/system";
import { useSearchParams } from "react-router-dom";

export const defaults = {
  searchParamName: "sivu",
  defaultPage: 1,
};

export function TablePagination(
  props: React.ComponentProps<typeof Pagination>
) {
  return (
    <Box display="flex" justifyContent="center" mt={3}>
      <Pagination {...props} />
    </Box>
  );
}

interface PaginationWithRouterIntegrationProps
  extends UsePaginationPageParams,
    React.ComponentProps<typeof Pagination> {}

export const withRouterIntegration = (Component: typeof Pagination) =>
  function PaginationWithRouterIntegration({
    searchParamName = defaults.searchParamName,
    defaultPage = defaults.defaultPage,
    ...other
  }: PaginationWithRouterIntegrationProps) {
    const [page, setPage] = usePaginationPage();

    return (
      <Component
        page={page}
        onChange={(_event, page) => {
          setPage(page);
        }}
        {...other}
      />
    );
  };

export const TablePaginationWithRouterIntegration =
  withRouterIntegration(TablePagination);

interface UsePaginationPageParams {
  searchParamName?: string;
  defaultPage?: number;
}

export const usePaginationPage = ({
  searchParamName = defaults.searchParamName,
  defaultPage = defaults.defaultPage,
}: UsePaginationPageParams = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get(searchParamName) ?? defaultPage);

  const setPage = (page: number) => {
    setSearchParams(updatePage(page));
  };

  const updatePage = (page: number) => (searchParams: URLSearchParams) => {
    if (page === defaultPage) {
      return resetPage(searchParams);
    } else {
      searchParams.set(searchParamName, String(page));
    }
    return searchParams;
  };

  const resetPage = (searchParams: URLSearchParams) => {
    searchParams.delete(searchParamName);
    return searchParams;
  };

  return [page, setPage, { resetPage, updatePage }] as [
    typeof page,
    typeof setPage,
    { resetPage: typeof resetPage; updatePage: typeof updatePage }
  ];
};
