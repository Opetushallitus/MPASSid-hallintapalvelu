import { Grid, Typography } from "@mui/material";
import type { Components } from "@/api";
import { FormattedMessage } from 'react-intl';
import { DataRow } from "@/routes/integraatio/IntegrationTab/DataRow";
import Type from "./Type";
import InputForm from "../Form/InputForm";
import type { Dispatch, MutableRefObject} from "react";
import { useRef } from "react";
import { devLog } from "@/utils/devLog";
import { helperText, validate } from "@/utils/Validators";
import type { UiConfiguration } from "@/config";
import { dataConfiguration, defaultDataConfiguration } from "@/config";

interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: MutableRefObject<number>;
  name: string;
  tenantId?: string;
  metadataUrl?: string;
  metadataFile?: File[];
  setName: Dispatch<string>;
  setCanSave: Dispatch<boolean>;
  setEnvironment: Dispatch<number>;
  setMetadataUrl: Dispatch<string>;
  setMetadataFile?: Dispatch<File[]>;
}

export default function ServiceProvider({ integration, setName, setCanSave, name }: Props) {
  const currentName = useRef<string>(name);
  const serviceProvider = integration.configurationEntity!.sp!;
  const configuration:UiConfiguration = dataConfiguration.filter(conf=>conf.type&&conf.type==='integrationDetails').find(conf=>conf.name&&conf.name==='serviceName') || defaultDataConfiguration;
  const isEditable = (integration.integrationSets&&integration.integrationSets.length>0&&integration.integrationSets[0].id&&integration.integrationSets[0].id!==0)?false:true;

  const updateName = (name: string,value: string,type: string) => {
    devLog("DEBUG","ServiceProvider (updateName)",value)
    setName(value)
  }

  const canSave = (data:boolean) => {
    devLog("DEBUG","ServiceProvider (canSave)",data)
    setCanSave(data)
  }

  const validator = (value:string) => {
    devLog("DEBUG","ServiceProvider validator ( configuration.name)", configuration.name)
    devLog("DEBUG","ServiceProvider validator (configuration)",configuration)
    devLog("DEBUG","ServiceProvider validator (value)",value)
    return validate(configuration.validation,value);
  }

  const helpGeneratorText = (value:string) => {
    devLog("DEBUG","helpGeneratorText ( configuration.name)", configuration.name)
    devLog("DEBUG","helpGeneratorText (configuration)",configuration)
    devLog("DEBUG","helpGeneratorText (value)",value)
    
    return helperText(configuration.validation,value)
  }

  return (
    <>
      <Typography variant="h2" gutterBottom>
        <FormattedMessage defaultMessage="Palveluiden yhteiset tiedot" />
      </Typography>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Palveluympäristö" />
        </Grid>
        <Grid item xs={8}>
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
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Palvelun nimi" />
        </Grid>
        <Grid item xs={8}>
          <InputForm 
                object={currentName.current} 
                type={""} label={""} 
                attributeType={""} 
                isEditable={isEditable} 
                mandatory={true} 
                path={"undefined"} 
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