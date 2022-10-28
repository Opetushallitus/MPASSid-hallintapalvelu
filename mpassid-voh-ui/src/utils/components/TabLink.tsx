import Tab from "@mui/material/Tab";
import { merge } from "lodash";
import { Link } from "react-router-dom";

interface Props
  extends React.ComponentProps<typeof Tab>,
    Pick<React.ComponentProps<typeof Link>, "to"> {
  value: string;
}

export default function TabLink(props: Props) {
  return (
    <Tab
      {...props}
      component={Link as any}
      sx={merge(
        {
          minHeight: "inherit",
        },
        props.sx
      )}
    />
  );
}
