import { Grid, Typography } from "@mui/material";
import type { Components } from "@/api";
import { FormattedMessage } from 'react-intl';
import { DataRow } from "@/routes/integraatio/IntegrationTab/DataRow";
import Type from "./Type";
import InputForm from "../Form/InputForm";
import { Dispatch, useRef } from "react";

interface Props {
  integration: Components.Schemas.Integration;
  oid: string;
  environment: number;
  setName: Dispatch<string>;
}

export default function ServiceProvider({ integration, setName }: Props) {
  const currentName = useRef<string>(integration.configurationEntity?.sp?.name||'ERROR');
  const serviceProvider = integration.configurationEntity!.sp!;

  const updateName = (name: string,value: string,type: string) => {
    console.log("********* name: ",name,value,type)
    if(name) {
      setName(name);
    }
    
  }

  const validateName = (name:string) => {
    console.log("********* name: ",name)
    return true
  }

  const canSave = (data:boolean) => {
    console.log("********* data: ",data)
    return true
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
                mandatory={false} 
                path={"undefined"} 
                helperText={function (data: string): JSX.Element {
                  throw new Error("Function not implemented.");
                } } 
                setCanSave={canSave} 
                onUpdate={updateName} 
                onValidate={validateName}></InputForm>
        </Grid>
      </>)}
        <DataRow object={serviceProvider} path="type" type={Type} />
      </Grid>
    </>
  );
}