import type { ChangeEvent } from "react";
import { useEffect, useId, useState } from "react";
import { FormHelperText, Grid, IconButton, Paper } from "@mui/material";
import { PhotoCamera } from "@mui/icons-material";
import { FormattedMessage, useIntl } from "react-intl";
import { resizeImage } from "@/utils/resizeImage";
import { createLogger } from "@/utils/devLog";

const warnLog = createLogger("WARN");

// The logo is shown in the school selection view at most this size.
const MAX_WIDTH = 125;
const MAX_HEIGHT = 36;

interface Props {
  /** The saved logo, if any. */
  logoUrl?: string;
  /** A new logo has been chosen in this edit. */
  newLogo: boolean;
  /** Called with the resized logo. */
  onLogo: (logo: Blob) => void;
}

/**
 * The value cells of the "logoUrl" row and its preview rows. The preview is
 * state - not an <img>
 * looked up by id - and its object URL is released when replaced or unmounted.
 * The caller renders the row's title cell.
 */
export default function LogoField({ logoUrl, newLogo, onLogo }: Props) {
  const intl = useIntl();
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl]
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Lets the same file be chosen again (e.g. after a failure).
    event.target.value = "";
    if (!file) {
      return;
    }
    resizeImage(file, MAX_WIDTH, MAX_HEIGHT)
      .then((logo) => {
        setFailed(false);
        setPreviewUrl(URL.createObjectURL(logo));
        onLogo(logo);
      })
      .catch((error) => {
        warnLog("LogoField (logon käsittely epäonnistui)", error);
        setFailed(true);
      });
  };

  const hasLogo = Boolean(logoUrl) || newLogo;

  return (
    <>
      <Grid size={8}>
        <input accept="image/*" hidden id={inputId} type="file" onChange={handleChange} />
        <label htmlFor={inputId}>
          {hasLogo && (
            <>
              <IconButton color="primary" component="span">
                <PhotoCamera />
              </IconButton>
              <FormattedMessage defaultMessage="Valitse" />
            </>
          )}
          {!hasLogo && (
            <>
              <IconButton color="error" component="span">
                <PhotoCamera />
              </IconButton>
              <span>
                {intl.formatMessage({
                  defaultMessage: "Valitse, logo on pakollinen",
                })}
              </span>
            </>
          )}
        </label>
        {failed && (
          <FormHelperText error>
            <FormattedMessage defaultMessage="Kuvan käsittely epäonnistui. Valitse toinen kuva." />
          </FormHelperText>
        )}
      </Grid>

      <Grid size={4} />
      <Grid size={8}>{previewUrl && <img src={previewUrl} alt="logo" />}</Grid>

      {logoUrl && !newLogo && (
        <>
          <Grid size={4} />
          <Grid size={8}>
            <Paper variant="outlined" sx={{ display: "inline-flex" }}>
              <img
                src={logoUrl}
                alt={intl.formatMessage({
                  defaultMessage: "organisaation logo",
                  description: "saavutettavuus",
                })}
              />
            </Paper>
          </Grid>
        </>
      )}
    </>
  );
}
