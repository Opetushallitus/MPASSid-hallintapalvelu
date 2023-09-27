import Clear from "@mui/icons-material/Clear";
import Search from "@mui/icons-material/Search";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";

const SEARCH_PARAM_NANE = "hae";

interface Props {
  formData: FormData;
  onSearch: (formData: FormData) => void;
}

export default function SearchForm({ formData, onSearch }: Props) {
  const intl = useIntl();
  const defaultValue = formData.get(SEARCH_PARAM_NANE);
  const [isEmpty, setIsEmpty] = useState(!defaultValue);
  const [isDirty, setIsDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFormState = useCallback(
    function updateFormState() {
      setIsEmpty(!inputRef.current!.value);
      setIsDirty(inputRef.current!.value !== (defaultValue ?? ""));
    },
    [defaultValue]
  );

  useEffect(() => {
    updateFormState();
  }, [updateFormState]);

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();

        onSearch(new FormData(event.currentTarget));
      }}
      onChange={updateFormState}
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
              {!isEmpty && (
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
                  disabled={!isDirty}
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
