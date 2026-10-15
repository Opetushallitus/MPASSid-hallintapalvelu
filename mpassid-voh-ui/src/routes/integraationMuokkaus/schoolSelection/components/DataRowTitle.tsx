import { Box, Grid, Tooltip } from "@mui/material";
import { last, toPath } from "lodash";
import { FormattedMessage, useIntl } from "react-intl";

interface Props {
  /** Attribute path; its last part names the translation (attribuutti.<name>). */
  path?: string;
}

/** The title cell (4/12) of a SchoolSelection row, with the attribute name as tooltip. */
export default function DataRowTitle({ path }: Props) {
  const name = last(toPath(path));
  const intl = useIntl();
  const id = `attribuutti.${name}`;
  const tooltipId = `työkaluvihje.${name}`;
  const label = id in intl.messages ? { id } : undefined;
  const tooltip = tooltipId in intl.messages ? { id: tooltipId } : undefined;

  return (
    <Grid size={4}>
      <Tooltip
        title={
          <>
            {tooltip && (
              <Box sx={{ mb: 1 }}>
                <FormattedMessage {...tooltip} />
              </Box>
            )}
            <code>{name}</code>
          </>
        }
      >
        <span>{label ? <FormattedMessage {...label} /> : name}</span>
      </Tooltip>
    </Grid>
  );
}
