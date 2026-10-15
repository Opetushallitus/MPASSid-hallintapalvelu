import Tab, { type TabProps } from "@mui/material/Tab";
import { merge } from "lodash";
import { Link } from "react-router-dom";

// Tab rendered as a router Link: TabProps<typeof Link> carries Link's props
// (`to` etc.) so `component={Link}` type-checks without a cast.
interface Props extends TabProps<typeof Link> {
  value: string;
}

export default function TabLink(props: Props) {
  return (
    <Tab
      {...props}
      component={Link}
      sx={merge(
        {
          minHeight: "inherit",
        },
        props.sx
      )}
    />
  );
}
