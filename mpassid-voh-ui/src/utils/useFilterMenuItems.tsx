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

  const handleToggle = (value: string) => {
    setSearchParams((searchParams) => {
      const checked = getChecked(searchParams);

      return updateSearchParams(
        checked.includes(value)
          ? checked.filter((checkedValue) => checkedValue !== value)
          : [...checked, value]
      )(searchParams);
    });
  };

  const allChecked = checked.length === options.length;

  return {
    modified: !allChecked,
    children: (
      <>
        <ListItemCheckbox
          buttonProps={{
            onClick: () =>
              setSearchParams(
                updateSearchParams(
                  searchParams.has(searchParamName) ? options : []
                )
              ),
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
