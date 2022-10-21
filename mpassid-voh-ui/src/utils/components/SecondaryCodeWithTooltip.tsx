import { Secondary } from "@/utils/components/react-intl-values";
import { Box, Tooltip } from "@mui/material";
import { get, last, toPath } from "lodash";

export default function SecondaryCodeWithTooltip({
  object,
  path,
}: {
  object: Parameters<typeof get>[0];
  path: Parameters<typeof get>[1];
}) {
  const value = get(object, path, <span />);

  const title = last(toPath(path));

  let code = <code>{value}</code>;

  if (title) {
    code = <Tooltip title={title}>{code}</Tooltip>;
  }

  return (
    <Secondary
      component="div"
      sx={{
        lineHeight: "initial",
        width: 250,
        textOverflow: "ellipsis",
        overflow: "hidden",
        "&:hover": {
          position: "relative",
          overflow: "visible",
        },
      }}
    >
      <Box
        component="small"
        sx={{
          backgroundColor: "var(--background-color)",
          boxShadow: "0px 0px 5px 4px var(--background-color)",
        }}
      >
        {code}
      </Box>
    </Secondary>
  );
}
