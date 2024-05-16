import { Box, Fab } from "@mui/material";
import { Link } from "react-router-dom";
import EditIcon from '@mui/icons-material/Edit';
import type { Components } from "@/api";

interface Props {
  integration: Components.Schemas.Integration;
}

function EditIntegrationButton(props:Props) {

  const integration = props.integration
  const id = props.integration.id || "new"
  const type = props.integration.configurationEntity!.idp?.type || props.integration.configurationEntity!.sp?.type || props.integration.configurationEntity!.set?.type || "unknown"
  const editor: boolean = true;
  var to = ""
  if(integration?.configurationEntity?.idp) {
    to = "/muokkaa/idp/"+type+"/"+id
  }
  if(integration?.configurationEntity?.sp) {
    to = "/muokkaa/sp/"+type+"/"+id
  }
  if(integration?.configurationEntity?.set) {
    to = "/muokkaa/set/"+type+"/"+id
  }
  
  if(editor) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center">
        <Fab
          color="primary"
          component={Link} 
          to={to}
          state={props.integration}
          aria-label="add"
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