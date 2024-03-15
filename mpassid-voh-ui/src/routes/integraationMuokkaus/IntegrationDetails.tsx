import type { Components } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import _ from "lodash";

import {
  useIdentityProviderTypes,
  useServiceProviderTypes,
} from "@/api";
import {
  getRole,
  typeAbbreviations,
  typeTooltips,
} from "@/routes/home/IntegrationsTable";
import {
  Alert,
  AlertTitle,
  Grid,
  Link as MuiLink,
  Typography
} from "@mui/material";
import { Dispatch, useEffect, useState } from "react";
import { FormattedMessage } from 'react-intl';
import { useParams, Link } from "react-router-dom";
import Role from "./Role";
import { useIntegrationSafe } from "@/api";
import { DataRow } from "../integraatio/IntegrationTab/DataRow";
import type { DataRowProps } from "../integraatio/IntegrationTab/DataRow";

import Metadata from "./Metadata";
import Attributes from "./Attributes";
import UniqueId from "./UniqueId";
import { inits } from "./Inits";

interface Props {
  id: number;
  setSaveDialogState: Dispatch<boolean>;
  setCannotSave: Dispatch<boolean>;
}

export default function IntegrationDetails({ id, setSaveDialogState, setCannotSave }: Props) {
    
    var { role } = useParams();
    const { type } = useParams();
    const types = [...useIdentityProviderTypes(), ...useServiceProviderTypes()];
    const [ newServiceProviderData, setNewServiceProviderData] = useState<Components.Schemas.ServiceProvider|undefined>();
    const [ newIdentityProviderData, setNewIdentityProviderData] = useState<Components.Schemas.IdentityProvider|undefined>();
    const [ newConfigurationEntityData, setNewConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity|undefined>();
    var [error, integration] = useIntegrationSafe({id});
    if(id===0) {
      integration = inits.idp.wilma
    } 

    useEffect(() => {
      if(role !== undefined) {
        setNewConfigurationEntityData(_.cloneDeep(integration.configurationEntity))
        if(role==="sp") {
          setNewServiceProviderData(_.cloneDeep(integration.configurationEntity[role]))
        }
        if(role==="idp") {
          setNewIdentityProviderData(_.cloneDeep(integration.configurationEntity[role]))
        }
      }
      
    }, [role, integration]);

    useEffect(() => {
          if(newServiceProviderData&&role) {
            setSaveDialogState(true);
            if(_.isEqual(newServiceProviderData,integration.configurationEntity[role])){
              setCannotSave(false)
            } else {
              setCannotSave(true)
            }
          }  else {
            if(newIdentityProviderData&&role) {
              setSaveDialogState(true);
              if(_.isEqual(newIdentityProviderData,integration.configurationEntity[role])){
                setCannotSave(false)
              } else {
                setCannotSave(true)
              } 
            } else {
              setSaveDialogState(false);
            }
          }
        
    }, [newConfigurationEntityData,newServiceProviderData,newIdentityProviderData,integration,role,setCannotSave,setSaveDialogState]);
    
    
    console.log("id: ",id)
    console.log("role: ",role)
    console.log("integration: ",integration)
    console.log("error: ",error)

    var hasAttributes =
                role === "idp" &&
                !["opinsys", "wilma"].includes(
                  integration.configurationEntity?.[role]?.type!
                );

    
           

    if (error?.response?.status === 404||id===undefined||role===undefined||type===undefined) {
      return (
        <Alert severity="error">
          <FormattedMessage
            defaultMessage="<title>Integraatiota {id} ei löydy</title>Siirry <link>etusivulle</link>."
            values={{
              id,
              title: (chunks) => <AlertTitle>{chunks}</AlertTitle>,
              link: (chunks) => (
                <MuiLink color="error" component={Link} to="/">
                  {chunks}
                </MuiLink>
              ),
            }}
          />
        </Alert>
      );
    }

    if(integration) {
      console.log("hasAttributes: ",hasAttributes)  
    return(<>
    
      <Typography component={"div"} variant="h2" gutterBottom >
        <FormattedMessage defaultMessage="Organisaation tiedot" />
      </Typography>
      <Grid container spacing={2} mb={3}>
        <DataRow object={integration} path="organization.name" />
        <DataRow object={integration} path="organization.oid" />
        <DataRow object={integration} path="organization.ytunnus" />
        {role === "idp" && (
          <DataRow
            object={integration}
            path="configurationEntity.idp.logoUrl"
            type="image"
          />
        )}
      </Grid>

      {role === "idp" && (
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Oppilaitoksen valintanäkymän tiedot" />
          </Typography>
          <Grid container spacing={2} mb={3}>
            <DataRow
              object={integration}
              path="discoveryInformation.customDisplayName"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.showSchools"
              type="boolean"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.schools"
              type="text-list"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.excludedSchools"
              type="text-list"
            />
            <DataRow
              object={integration}
              path="discoveryInformation.title"
            />
          </Grid>
        </>
      )}

      {(role === "idp" || role === "sp" ) && (
        <>
            <Typography variant="h2" gutterBottom>
              <FormattedMessage defaultMessage="Integraation perustiedot" />
            </Typography>

            <Grid container spacing={2} mb={3}>
              <DataRow object={integration} path="id" />
              <Grid item xs={4}>
                <FormattedMessage defaultMessage="Jäsentyyppi" />
              </Grid>
              <Grid item xs={8}>
                <FormattedMessage {...typeAbbreviations[role]} /> (
                <FormattedMessage {...typeTooltips[role]} />)
              </Grid>
              <Grid item xs={4}>
                <FormattedMessage defaultMessage="Yksilöllinen tunniste" />
              </Grid>
              <Grid item xs={8}>
                <UniqueId
                  configurationEntity={integration.configurationEntity!}
                  role={role}
                  ValueComponent={UniqueIdValue}
                />
              </Grid>
                  
                {role === "sp" && (
                    <DataRow
                    object={integration}
                    path="integrationGroups"
                    type="service-list"
                  />
                )}
            </Grid>
          </>
      )}    
      <Role integration={integration} />

      {newServiceProviderData&&<Metadata
        newServiceProviderData={newServiceProviderData}
        setNewServiceProviderData={setNewServiceProviderData}
        configurationEntity={integration.configurationEntity!}
        role={role}
        type={type}
      />}

      <Grid mb={hasAttributes ? 3 : undefined}>
        <ErrorBoundary>
          <Attributes
            attributes={integration.configurationEntity?.attributes ?? []}
            type="data"
          />
        </ErrorBoundary>
      </Grid>
      
      {hasAttributes && (
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Attribuutit" />
          </Typography>
          <ErrorBoundary>
            <Attributes
              newConfigurationEntityData={newConfigurationEntityData}
              setNewConfigurationEntityData={setNewConfigurationEntityData}  
              attributes={integration.configurationEntity?.attributes ?? []}
              type="user"
            />
          </ErrorBoundary>
             
        </>
      )}
      
    </>)} else {
      return(<></>)
    }
}

export function UniqueIdValue({ name, label, children }: DataRowProps) {
  return (
    <>
      {(children as JSX.Element)?.props?.value ? children : "–"} (
      <span>{label ? <FormattedMessage {...label} /> : name}</span>)
    </>
  );
}
