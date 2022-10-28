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
  const [, setTabs] = useSessionStorage<string[]>(
    openIntegrationsSessionStorageKey,
    []
  );
  const { integrationId } = useParams();

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

              setTabs((tabs) => {
                const filteredTabs = tabs.filter((tab) => tab !== id);

                if (integrationId) {
                  if (filteredTabs.length && tabs.includes(id)) {
                    const nextTabIndex =
                      id === integrationId
                        ? Math.min(tabs.indexOf(id), filteredTabs.length - 1)
                        : filteredTabs.indexOf(integrationId);

                    navigate(`/integraatio/${filteredTabs[nextTabIndex]}`);
                  } else {
                    navigate("");
                  }
                }

                return filteredTabs;
              });
            }}
          />
        </Fade>
      }
      iconPosition="end"
    />
  );
}
