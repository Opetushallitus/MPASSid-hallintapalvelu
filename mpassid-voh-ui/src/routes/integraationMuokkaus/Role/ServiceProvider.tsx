import { Grid, Typography } from "@mui/material";
import type { Components } from "@/api";
import { FormattedMessage } from 'react-intl';
import { DataRow } from "@/routes/integraatio/IntegrationTab/DataRow";
import Type from "./Type";
import InputForm from "../Form/InputForm";
import type { Dispatch } from "react";
import { createLogger } from "@/utils/devLog";
import { helperText, validate } from "@/utils/Validators";
import type { UiConfiguration } from "@/config";
import { defaultDataConfiguration } from "@/config";

const debugLog = createLogger("DEBUG");

interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: number;
  name: string;
  tenantId?: string;
  metadataUrl?: string;
  metadataFile?: File[];
  dataConfiguration:UiConfiguration[];
  setName: Dispatch<string>;
  setCanSave: Dispatch<boolean>;
  setEnvironment: Dispatch<number>;
  setMetadataUrl: Dispatch<string>;
  setMetadataFile?: Dispatch<File[]>;
}

export default function ServiceProvider({ integration, setName, setCanSave, name,dataConfiguration }: Props) {
  const serviceProvider = integration.configurationEntity!.sp!;
  const configuration:UiConfiguration = dataConfiguration.filter(conf=>conf.type&&conf.type==='integrationDetails').find(conf=>conf.name&&conf.name==='serviceName') || defaultDataConfiguration;
  const isEditable = (integration.integrationSets&&integration.integrationSets.length>0&&integration.integrationSets[0].id&&integration.integrationSets[0].id!==0)?false:true;

  const updateName = (name: string,value: string,_type: string) => {
    debugLog("ServiceProvider (updateName)",value)
    setName(value)
  }

  const canSave = (data:boolean) => {
    debugLog("ServiceProvider (canSave)",data)
    setCanSave(data)
  }

  const validator = (value:string) => {
    debugLog("ServiceProvider validator (configuration.name)", configuration.name)
    debugLog("ServiceProvider validator (configuration)",configuration)
    debugLog("ServiceProvider validator (value)",value)
    return validate(configuration.validation,value);
  }

  const helpGeneratorText = (value:string) => {
    debugLog("helpGeneratorText (configuration.name)", configuration.name)
    debugLog("helpGeneratorText (configuration)",configuration)
    debugLog("helpGeneratorText (value)",value)
    
    return helperText(configuration.validation,value)
  }

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Palveluiden yhteiset tiedot" />
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={4}>
          <FormattedMessage defaultMessage="Palveluympäristö" />
        </Grid>
        <Grid size={8}>
          <FormattedMessage
            defaultMessage={`{deploymentPhase, select,
              0 {Testi}
              1 {Tuotanto}
              2 {Tuotanto-Testi}
              other {Tuntematon}
            }`}
            values={{ deploymentPhase: integration.deploymentPhase }}
          />
        </Grid>
        {!isEditable&&(
        <DataRow object={serviceProvider} path="name" />
        )}
        {isEditable&&(
          <>
        <Grid size={4}>
          <FormattedMessage defaultMessage="Palvelun nimi" />
        </Grid>
        <Grid size={8}>
          <InputForm
                object={{ content: name }}
                type={""} label={"palvelun nimi"}
                attributeType={""}
                isEditable={isEditable}
                mandatory={true}
                path={"content"}
                helperText={helpGeneratorText}
                setCanSave={canSave}
                onUpdate={updateName}
                onValidate={validator}></InputForm>
        </Grid>
      </>)}
        <DataRow object={serviceProvider} path="type" type={Type} />
      </Grid>
    </>
  );
}