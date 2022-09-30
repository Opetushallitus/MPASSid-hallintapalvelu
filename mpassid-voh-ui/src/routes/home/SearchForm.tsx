import { Clear, Search } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useRef, useState } from "react";
import { useIntl } from "react-intl";

const SEARCH_PARAM_NANE = "hae";

interface Props {
  formData: FormData;
  onSearch: (formData: FormData) => void;
}

export default function SearchForm({ formData, onSearch }: Props) {
  const intl = useIntl();
  const defaultValue = formData.get(SEARCH_PARAM_NANE);
  const [disabled, setDisabled] = useState(!defaultValue);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();

        onSearch(new FormData(event.currentTarget));
      }}
      onChange={() => {
        setDisabled(!inputRef.current!.value);
      }}
    >
      <TextField
        placeholder={intl.formatMessage({
          defaultMessage: "Etsi nimellä, OID:lla tai y-tunnuksella",
        })}
        name={SEARCH_PARAM_NANE}
        defaultValue={defaultValue}
        fullWidth
        inputProps={{
          ref: inputRef,
          autoComplete: "off",
        }}
        InputProps={{
          endAdornment: (
            <>
              {!disabled && (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    aria-label={intl.formatMessage({
                      defaultMessage: "tyhjennä",
                    })}
                    onClick={() => {
                      inputRef.current!.value = "";

                      onSearch(new FormData(formRef.current!));
                    }}
                  >
                    <Clear />
                  </IconButton>
                </InputAdornment>
              )}
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  color="primary"
                  disabled={disabled}
                  aria-label={intl.formatMessage({
                    defaultMessage: "etsi",
                  })}
                  type="submit"
                >
                  <Search />
                </IconButton>
              </InputAdornment>
            </>
          ),
        }}
      />
    </form>
  );
}
