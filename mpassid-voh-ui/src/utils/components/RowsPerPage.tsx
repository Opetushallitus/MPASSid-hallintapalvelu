import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import type { SelectChangeEvent } from "@mui/material/Select";
import Select from "@mui/material/Select";
import { useId } from "react";
import { FormattedMessage } from "react-intl";
import { useSearchParams } from "react-router-dom";
import * as pagination from "./pagination";

export const defaults = {
  default: 10,
  options: [10, 25, 50, 100],
  paginationSearchParamName: pagination.defaults.searchParamName,
  searchParamName: "määrä",
};

interface Props {
  default?: number;
  options?: number[];
  paginationSearchParamName?: string;
  searchParamName?: string;
}

export default function RowsPerPage(props: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultValue = String(props.default ?? defaults.default);
  const options = props.options ?? defaults.options;
  const paginationSearchParamName =
    props.paginationSearchParamName ?? defaults.paginationSearchParamName;
  const searchParamName = props.searchParamName ?? defaults.searchParamName;

  const value = searchParams.get(searchParamName) ?? defaultValue;

  const handleChange = (event: SelectChangeEvent) => {
    setSearchParams((searchParams) => {
      const value = String(event.target.value);
      searchParams.delete(paginationSearchParamName);
      if (value === defaultValue) {
        searchParams.delete(searchParamName);
      } else {
        searchParams.set(searchParamName, value);
      }
      return searchParams;
    });
  };

  const labelId = useId();
  const id = useId();

  return (
    <>
      <InputLabel id={labelId} sx={{ mr: 1, display: "inline" }}>
        <FormattedMessage defaultMessage="Näytä sivulla" />:
      </InputLabel>
      <Select
        labelId={labelId}
        id={id}
        value={value}
        onChange={handleChange}
        variant="standard"
        sx={
          // Hide border
          {
            ":before": { display: "none" },
            ":after": { display: "none" },
          }
        }
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </>
  );
}
