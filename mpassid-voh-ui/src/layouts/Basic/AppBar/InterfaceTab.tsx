import { openIntegrationsSessionStorageKey } from "@/config";
import TabLink from "@/utils/components/TabLink";
import CloseIcon from "@mui/icons-material/Close";
import { Fade } from "@mui/material";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSessionStorage } from "usehooks-ts";

interface TabProps {
  id: string;
  value: string;
}
export default function InterfaceTab({ id, ...otherProps }: TabProps) {
  const [hover, setHover] = useState(false);
  const navigate = useNavigate();
  const [tabs, setTabs] = useSessionStorage<string[]>(
    openIntegrationsSessionStorageKey,
    []
  );
  const { integrationId } = useParams();

  const close = () => {
    const remaining = tabs.filter((tab) => tab !== id);
    setTabs(remaining);
    // Closing the open integration's tab moves to the tab now in its place
    // (or the one before it, if it was the last); without tabs, to the
    // home page. Closing another tab stays on the page.
    if (id === integrationId) {
      const next = remaining[Math.min(tabs.indexOf(id), remaining.length - 1)];
      navigate(next === undefined ? "/" : `/integraatio/${next}`);
    }
  };

  return (
    <TabLink
      {...otherProps}
      label={id}
      to={`/integraatio/${id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      icon={
        <Fade in={hover}>
          <CloseIcon
            fontSize="small"
            sx={{ position: "absolute", top: 6, right: 2 }}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              close();
            }}
          />
        </Fade>
      }
      iconPosition="end"
    />
  );
}
