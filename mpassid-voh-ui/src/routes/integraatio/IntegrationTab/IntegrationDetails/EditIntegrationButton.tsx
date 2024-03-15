import React from "react";
import { Box, Fab } from "@mui/material";
import { Link } from "react-router-dom";
import EditIcon from '@mui/icons-material/Edit';

interface Props {
  integration: any;
}

function EditIntegrationButton(props:Props) {

  const integration = props.integration.id || "new"
  const type = props.integration.configurationEntity!.idp?.type || props.integration.configurationEntity!.sp?.type || props.integration.configurationEntity!.set?.type || "unknown"
  const editor: boolean = true;
  var to = ""
  if(props.integration!.configurationEntity!.idp!) {
    to = "/muokkaa/idp/"+type+"/"+integration
  }
  if(props.integration!.configurationEntity!.sp!) {
    to = "/muokkaa/sp/"+type+"/"+integration
  }
  if(props.integration!.configurationEntity!.set!) {
    to = "/muokkaa/set/"+type+"/"+integration
  }
  
  if(editor) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center">
        <Fab
          color="primary"
          component={Link} 
          to={to}
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