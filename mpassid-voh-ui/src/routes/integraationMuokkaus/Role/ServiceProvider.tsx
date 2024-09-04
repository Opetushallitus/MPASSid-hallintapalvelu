import { Grid, Typography } from "@mui/material";
import type { Components } from "@/api";
import { FormattedMessage } from 'react-intl';
import { DataRow } from "@/routes/integraatio/IntegrationTab/DataRow";
import Type from "./Type";
import InputForm from "../Form/InputForm";
import type { Dispatch} from "react";
import { useEffect, useRef } from "react";
import { devLog } from "@/utils/devLog";
import { helperText, validate } from "@/utils/Validators";
import { dataConfiguration, defaultDataConfiguration, UiConfiguration } from "@/config";

interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: number;
  setName: Dispatch<string>;
  setCanSave: Dispatch<boolean>;
}

export default function ServiceProvider({ integration, setName, setCanSave }: Props) {
  const currentName = useRef<string>(integration.configurationEntity?.sp?.name||'ERROR');
  const serviceProvider = integration.configurationEntity!.sp!;
  const configuration:UiConfiguration = dataConfiguration.filter(conf=>conf.type&&conf.type==='integrationDetails').find(conf=>conf.name&&conf.name==='serviceName') || defaultDataConfiguration;

  useEffect(() => {
    devLog("ServiceProvider (currentName)",currentName)
    if(currentName.current===''||currentName.current==='uusi'){
      setCanSave(false);
    } else {
      setCanSave(true);
    }
    
  }, [currentName, setCanSave]);

  const updateName = (name: string,value: string,type: string) => {
    devLog("ServiceProvider (updateName)",value)
    currentName.current=value
    setName(value)
  }

  const canSave = (data:boolean) => {
    devLog("ServiceProvider (canSave)",data)
    setCanSave(data)
  }

  const validator = (value:string) => {
    devLog("ServiceProvider validator ( configuration.name)", configuration.name)
    devLog("ServiceProvider validator (configuration)",configuration)
    devLog("ServiceProvider validator (value)",value)
    return validate(configuration.validation,value);
  }

  const helpGeneratorText = (value:string) => {
    devLog("helpGeneratorText ( configuration.name)", configuration.name)
    devLog("helpGeneratorText (configuration)",configuration)
    devLog("helpGeneratorText (value)",value)
    
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
        {serviceProvider.name!=='uusi'&&(
        <DataRow object={serviceProvider} path="name" />
        )}
        {serviceProvider.name==='uusi'&&(
          <>
        <Grid item xs={4}>
          <FormattedMessage defaultMessage="Palvelun nimi" />
        </Grid>
        <Grid item xs={8}>
          <InputForm 
                object={currentName.current} 
                type={""} label={""} 
                attributeType={""} 
                isEditable={serviceProvider.name==='uusi'} 
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