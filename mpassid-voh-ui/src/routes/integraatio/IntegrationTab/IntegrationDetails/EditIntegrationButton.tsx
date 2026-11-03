import { Box, Fab } from "@mui/material";
import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import EditIcon from '@mui/icons-material/Edit';
import type { Components } from "@/api";
import { refetchIntegration } from "@/api";
import { useIntl } from "react-intl";
import { createLogger } from "@/utils/devLog";

const warnLog = createLogger("WARN");

interface Props {
  integration: Components.Schemas.Integration;
}

/**
 * Whether the integration can be handed to the edit page as is. An idp's
 * school selection needs the organisation's schools (organization.children
 * with their institution types), which the backend adds only to GET
 * responses - the save response, shown on the view page right after saving,
 * has none, and the edit page then offered no schools at all ("Kaikki koulut
 * ovat jo käytössä muissa integraatioissa" in production).
 */
export const hasEditData = (integration: Components.Schemas.Integration) =>
  !integration.configurationEntity?.idp ||
  (integration.organization?.children ?? []).some((school) => Boolean(school.oppilaitostyyppi))

function EditIntegrationButton(props:Props) {

  const intl = useIntl();
  const navigate = useNavigate();
  const integration = props.integration
  const id = props.integration.id || "new"
  const type = props.integration.configurationEntity!.idp?.type || props.integration.configurationEntity!.sp?.type || props.integration.configurationEntity!.set?.type || "unknown"
  const editor: boolean = true;
  let to = ""
  if(integration?.configurationEntity?.idp) {
    to = "/muokkaa/idp/"+type+"/"+id
  }
  if(integration?.configurationEntity?.sp) {
    to = "/muokkaa/sp/"+type+"/"+id
  }
  if(integration?.configurationEntity?.set) {
    to = "/muokkaa/set/"+type+"/"+id
  }
  const complete = hasEditData(integration)

  // Incomplete: the edit page loads the integration by id. Load it again
  // first - the cached GET may be from before the save - then go there
  // without the navigation state.
  const handleClick = (event: MouseEvent) => {
    if(complete || integration.id === undefined) {
      return
    }
    event.preventDefault()
    refetchIntegration({ id: integration.id })
      .catch((error) => warnLog("EditIntegrationButton (integraation uudelleenhaku epäonnistui)", error))
      .then(() => navigate(to))
  }

  if(editor) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Fab
          color="primary"
          component={Link}
          to={to}
          state={complete ? props.integration : undefined}
          onClick={handleClick}
          aria-label={intl.formatMessage({
            defaultMessage: "lisää",
          })}
          size="large"
          sx={{
            position: "fixed",
            right: 20,
            bottom: "2.2rem",
          }}
        >
          <EditIcon />
        </Fab>
      </Box>
    );
  } else {
    return(<></>)
  }

}

export default EditIntegrationButton;
