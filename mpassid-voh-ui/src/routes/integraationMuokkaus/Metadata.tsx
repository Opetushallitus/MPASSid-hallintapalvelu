import type { Components } from "@/api";
import type { roles } from "@/config";
import { Grid, Typography } from "@mui/material";
import { FormattedMessage } from "react-intl";
import LinkValue from "./LinkValue";
import InputForm from "./Form/InputForm";
import ListForm from "./Form/ListForm";
import React, { Dispatch, useEffect } from "react";

export default function Metadata({
  newServiceProviderData,
  setNewServiceProviderData,
  configurationEntity,
  role,
  type,
}: {
  newServiceProviderData?: Components.Schemas.ServiceProvider; 
  setNewServiceProviderData?: Dispatch<Components.Schemas.ServiceProvider>
  configurationEntity: Components.Schemas.ConfigurationEntity;
  role: string;
  type: string; 
}) {
  

  
  

  if(role=="sp") {
    const providerData:Components.Schemas.ServiceProvider = configurationEntity[role]!;
    
    const logUpdateValue = (value:String) => {  
      console.log("newServiceProviderData: ",newServiceProviderData)
    }
    const emptyValidate = (value:String) => {  
      return true;
    }

    const updateScope = (value:String) => {
      console.log("value: ",value)
        console.log("newServiceProviderData: ",newServiceProviderData)

    }
    
    const validateRedirectUri = (value:string) => {
      
      var urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
	    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
	    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
	    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
	    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
	    '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
	    return !!urlPattern.test(value);

    }
    const helperTextForRedirectUri=<FormattedMessage defaultMessage="Uri ei ole FQDN muodossa!" />

    const updateRedirectUri = (value:String) => {
      console.log("updateRedirectUri value: ",value)
      //var newUris:Array<String> = [];

      if(newServiceProviderData?.metadata?.redirect_uris) {
          const index = newServiceProviderData.metadata.redirect_uris.indexOf(value)
          if(index>=0) {
              newServiceProviderData.metadata.redirect_uris.splice(index, 1);
          } else {
            newServiceProviderData.metadata.redirect_uris.push(value)
          }
      } 
      
      
      if(setNewServiceProviderData) {
        setNewServiceProviderData({ ...newServiceProviderData})
      }
      
    }
    if (newServiceProviderData !== undefined&&newServiceProviderData.metadata && newServiceProviderData.metadata !== undefined) {  
      const value = newServiceProviderData.metadata.encoding && newServiceProviderData.metadata.content !== undefined
        ? atob(newServiceProviderData.metadata.content as unknown as string)
        : JSON.stringify(newServiceProviderData.metadata, null, 2);
      if(type==="oidc") {
        return (<>
          <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="grant_types" />
          </Grid>
          <Grid item xs={8} sx={{}}>
          <Typography
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              variant="caption"
            >
              <ListForm object={newServiceProviderData.metadata.grant_types} type="grant_type" onUpdate={logUpdateValue} onValidate={emptyValidate}></ListForm>
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="scope" />
          </Grid>
          <Grid item xs={8} sx={{}}>
            <Typography
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              variant="caption"
            >
              <InputForm object={newServiceProviderData} path="metadata.scope" type="scope" isEditable={false} onUpdate={updateScope}></InputForm>
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="redirect_uris" />
          </Grid>
          <Grid item xs={8} sx={{}}>
          <Typography
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              variant="caption"
            >
              <ListForm object={newServiceProviderData.metadata.redirect_uris} type="redirect_uri" isEditable={true} onUpdate={updateRedirectUri} onValidate={validateRedirectUri} helperText={helperTextForRedirectUri}></ListForm>
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="client_id" />
          </Grid>
          <Grid item xs={8} sx={{}}>
          <Typography
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              variant="caption"
            >
              <InputForm object={newServiceProviderData} path="metadata.client_id" type="client_id" isEditable={false} onUpdate={logUpdateValue}></InputForm>
           
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="client_secret" />
          </Grid>
          <Grid item xs={8} sx={{}}>
          <Typography
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              variant="caption"
            >
              <InputForm object={newServiceProviderData} path="metadata.client_secret" type="client_secret" isEditable={false} onUpdate={logUpdateValue}></InputForm>
            </Typography>
          </Grid>
        </Grid>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="response_types" />
          </Grid>
          <Grid item xs={8} sx={{}}>
          <Typography
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              variant="caption"
            >
              <ListForm object={newServiceProviderData.metadata.response_types} type="response_type" onUpdate={logUpdateValue} onValidate={emptyValidate}></ListForm>
            </Typography>
          </Grid>
        </Grid>
  
          
        </>
        );
      }

      return (<>
        
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="Metatiedot" />
          </Grid>
          <Grid item xs={8} sx={{}}>
            <Typography
              sx={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
              variant="caption"
            >
              <code>{value}</code>
            </Typography>
          </Grid>
        </Grid></>
      );
    }
  }
  if(role=="idp") {
    const providerData:Components.Schemas.Azure|Components.Schemas.Gsuite|Components.Schemas.Adfs = configurationEntity[role]!;
    if ((providerData.type==="azure"||providerData.type==="gsuite"||providerData.type==="adfs")&&providerData.metadataUrl) {
      return (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={4}>
            <FormattedMessage defaultMessage="Metatiedot" />
          </Grid>
          <Grid item xs={8}>
            <LinkValue href={providerData.metadataUrl} />
          </Grid>
        </Grid>
      );
    }
  }
  

  return null;
}
