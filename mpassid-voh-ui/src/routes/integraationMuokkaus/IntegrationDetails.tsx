import type { Components } from "@/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import _ from "lodash";
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
  setCanSave: Dispatch<boolean>;
  setNewIntegration: Dispatch<Components.Schemas.Integration>;
}

export default function IntegrationDetails({ id, setSaveDialogState, setCanSave, setNewIntegration }: Props) {
    
    const [isValid, setIsValid] = useState(true);
    var { role } = useParams();
    const { type } = useParams();
    const [ newConfigurationEntityData, setNewConfigurationEntityData] = useState<Components.Schemas.ConfigurationEntity>();
    var [error, integration] = useIntegrationSafe({id});
    var oid:string = "";
    var environment:number = 0
    if(id===0) {
      integration = inits.idp.wilma
    } else {
      oid = integration.organization.oid
      environment = integration.deploymentPhase
    }

    useEffect(() => {
      if(role !== undefined) {
        setNewConfigurationEntityData(_.cloneDeep(integration.configurationEntity))
      }
      
    }, [role, integration]);

    useEffect(() => {
          if(newConfigurationEntityData) {
            console.log("newConfigurationEntityData:",newConfigurationEntityData)
            setSaveDialogState(true);
            if(_.isEqual(newConfigurationEntityData,integration.configurationEntity)){
              //if(JSON.stringify(newConfigurationEntityData)===JSON.stringify(integration.configurationEntity)){  
                console.log("newConfigurationEntityData: equal")  
              setCanSave(false)
              
            } else {
              //integration.configurationEntity=newConfigurationEntityData
              //setNewIntegration(integration)
              console.log("newConfigurationEntityData: isValid: ",isValid)
              if(isValid) {
                setCanSave(true)
              } else {
                setCanSave(false)
              }
            }
          } else {
              setSaveDialogState(false);  
          }
        
    }, [newConfigurationEntityData,integration,setCanSave,setSaveDialogState,isValid]);

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
      <Role integration={integration} oid={oid} environment={environment} setCanSave={setIsValid}/>

      {newConfigurationEntityData&&<Metadata
        newConfigurationEntityData={newConfigurationEntityData}
        setNewConfigurationEntityData={setNewConfigurationEntityData}
        configurationEntity={integration.configurationEntity!}
        role={role}
        type={type}
        setCanSave={setIsValid}
      />}

      {newConfigurationEntityData && <Grid mb={hasAttributes ? 3 : undefined}>
        <ErrorBoundary>
          <Attributes
            newConfigurationEntityData={newConfigurationEntityData}
            setNewConfigurationEntityData={setNewConfigurationEntityData}  
            attributes={newConfigurationEntityData?.attributes ?? []}
            attributeType="data"
            environment={environment}
            type={type}
            role={role}
            oid={oid}
            setCanSave={setIsValid}
          />
        </ErrorBoundary>
      </Grid>}
      
      {hasAttributes && newConfigurationEntityData &&(
        <>
          <Typography variant="h2" gutterBottom>
            <FormattedMessage defaultMessage="Attribuutit" />
          </Typography>
          <ErrorBoundary>
            <Attributes
              newConfigurationEntityData={newConfigurationEntityData}
              setNewConfigurationEntityData={setNewConfigurationEntityData}  
              attributes={newConfigurationEntityData?.attributes ?? []}
              role={role}
              attributeType="user"
              environment={environment}
              type={type}
              oid={oid}
              setCanSave={setIsValid}
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
