import { ListItemCheckbox } from "@/utils/components/ListItemCheckbox";
import { Divider } from "@mui/material";
import { useIntl } from "react-intl";
import { useSearchParams } from "react-router-dom";
import { usePaginationPage } from "./components/pagination";

export default function useFilterMenuItems({
  options,
  optionsLabels,
  searchParamName,
}: {
  options: readonly string[];
  optionsLabels?: { [key: string]: string };
  searchParamName: string;
}) {
  function getChecked(searchParams: URLSearchParams) {
    return searchParams.has(searchParamName)
      ? searchParams
          .get(searchParamName)!
          .split(",")
          .filter((type) => options.includes(type))
      : options;
  }

  const updateSearchParams =
    (checked: readonly string[]) => (searchParams: URLSearchParams) => {
      if (checked.length === options.length) {
        searchParams.delete(searchParamName);
      } else {
        searchParams.set(searchParamName, checked.join(","));
      }

      return resetPage(searchParams);
    };

  const [, , { resetPage }] = usePaginationPage();
  const intl = useIntl();
  const [searchParams, setSearchParams] = useSearchParams();

  const checked = getChecked(searchParams);

  // react-router v7 wraps navigation state updates in React.startTransition,
  // so the `searchParams` snapshot from useSearchParams (and the one its
  // functional-updater form reads internally) is not yet committed between two
  // rapid clicks. Consecutive toggles would then each build off the same stale
  // base and clobber one another. The browser URL, however, is updated
  // synchronously by history.pushState on every navigate, so read the live
  // query string to always build off the latest committed filter state.
  const currentSearchParams = () =>
    new URLSearchParams(window.location.search);

  const handleToggle = (value: string) => {
    const searchParams = currentSearchParams();
    const checked = getChecked(searchParams);

    setSearchParams(
      updateSearchParams(
        checked.includes(value)
          ? checked.filter((checkedValue) => checkedValue !== value)
          : [...checked, value]
      )(searchParams)
    );
  };

  const allChecked = checked.length === options.length;

  return {
    modified: !allChecked,
    children: (
      <>
        <ListItemCheckbox
          buttonProps={{
            onClick: () => {
              const searchParams = currentSearchParams();
              setSearchParams(
                updateSearchParams(
                  searchParams.has(searchParamName) ? options : []
                )(searchParams)
              );
            },
          }}
          checkboxProps={{ checked: allChecked }}
          textProps={{
            primary: intl.formatMessage({
              defaultMessage: "Valitse kaikki",
            }),
          }}
        />
        <Divider />
        {options.map((value) => (
          <ListItemCheckbox
            key={value}
            buttonProps={{ onClick: () => handleToggle(value) }}
            checkboxProps={{ checked: checked.includes(value) }}
            textProps={{
              primary: optionsLabels?.[value] ?? value,
            }}
          />
        ))}
      </>
    ),
  };
}
